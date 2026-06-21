import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";
import { validateImageFile } from "@/lib/file-validation";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bookingId = searchParams.get("bookingId");
  if (!bookingId) return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });

  // Consent forms contain PII (signatures, photo ID paths, health disclosures).
  // Server-validate the session — getUser() hits Supabase, not just the cookie.
  const serverClient = createClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("consent_forms")
    .select("*")
    .eq("booking_id" as never, bookingId)
    .maybeSingle();

  return NextResponse.json({ consentForm: data ?? null });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const bookingId = formData.get("bookingId") as string;
  const fullName = formData.get("fullName") as string;
  const dob = formData.get("dob") as string;
  const signature = formData.get("signature") as string;
  const isMinor = formData.get("isMinor") === "true";
  const guardianName = (formData.get("guardianName") as string) || null;
  const guardianSignature = (formData.get("guardianSignature") as string) || null;
  const idPhoto = formData.get("idPhoto") as File | null;

  if (!bookingId || !fullName || !dob || !signature || !idPhoto) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const typeCheck = await validateImageFile(idPhoto);
  if (!typeCheck.valid) {
    return NextResponse.json({ error: typeCheck.error }, { status: 415 });
  }
  if (isMinor && (!guardianName || !guardianSignature)) {
    return NextResponse.json({ error: "Guardian information required for minors" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: bookingData } = await supabase
    .from("bookings")
    .select("id, client_id, studio_id, status")
    .eq("id", bookingId)
    .single();

  const booking = bookingData as {
    id: string;
    client_id: string;
    studio_id: string;
    status: string;
  } | null;

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  // Idempotent: consent already submitted
  const { data: existingConsent } = await supabase
    .from("consent_forms")
    .select("id")
    .eq("booking_id" as never, bookingId)
    .maybeSingle();

  if (existingConsent) {
    return NextResponse.json({ success: true, bookingId });
  }

  // Verify deposit paid — check deposit_payments (owner-initiated flow) first,
  // then fall back to the legacy deposits table (client self-serve flow).
  const { data: dpRaw } = await supabase
    .from("deposit_payments" as never)
    .select("payment_status, stripe_checkout_session_id")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const dp = dpRaw as { payment_status: string; stripe_checkout_session_id: string | null } | null;

  if (dp) {
    if (dp.payment_status !== "paid") {
      if (!dp.stripe_checkout_session_id) {
        return NextResponse.json({ error: "Deposit payment has not been completed" }, { status: 402 });
      }
      let stripe;
      try {
        stripe = getStripe();
      } catch {
        return NextResponse.json({ error: "Payment system unavailable" }, { status: 503 });
      }
      const session = await stripe.checkout.sessions.retrieve(dp.stripe_checkout_session_id);
      if (session.payment_status !== "paid") {
        return NextResponse.json({ error: "Deposit payment has not been completed" }, { status: 402 });
      }
      // Webhook race — mark deposit_payments paid so consent form can proceed
      await supabase
        .from("deposit_payments" as never)
        .update({
          payment_status: "paid",
          paid_at: new Date().toISOString(),
          stripe_payment_intent_id: session.payment_intent as string,
        } as never)
        .eq("booking_id", bookingId)
        .eq("payment_status", "pending");
    }
  } else {
    // No deposit_payments row — check legacy deposits table
    const { data: legacyData } = await supabase
      .from("deposits" as never)
      .select("status, stripe_checkout_session_id")
      .eq("booking_id" as never, bookingId)
      .maybeSingle();

    const legacyDeposit = legacyData as { status: string; stripe_checkout_session_id: string } | null;

    if (!legacyDeposit) {
      return NextResponse.json({ error: "No deposit found for this booking" }, { status: 402 });
    }

    if (legacyDeposit.status !== "paid") {
      let stripe;
      try {
        stripe = getStripe();
      } catch {
        return NextResponse.json({ error: "Payment system unavailable" }, { status: 503 });
      }
      const session = await stripe.checkout.sessions.retrieve(legacyDeposit.stripe_checkout_session_id);
      if (session.payment_status !== "paid") {
        return NextResponse.json({ error: "Deposit payment has not been completed" }, { status: 402 });
      }
      // Webhook hasn't fired yet — mark paid now
      await supabase
        .from("deposits" as never)
        .update({ status: "paid", paid_at: new Date().toISOString() } as never)
        .eq("booking_id" as never, bookingId);
    }
  }

  // Studio state for consent template
  const { data: studioData } = await supabase
    .from("studios")
    .select("state")
    .eq("id", booking.studio_id)
    .single();
  const stateTemplate = (studioData as { state: string | null } | null)?.state ?? "US";

  // Ensure bucket exists — service role can create it if the migration hasn't run
  const { error: bucketErr } = await supabase.storage.createBucket("id-photos", {
    public: false,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/heic"],
  });
  // "already exists" (409) is expected and fine; any other error is unexpected
  if (bucketErr && !bucketErr.message.toLowerCase().includes("already exist")) {
    console.error("[consent-forms] bucket create:", bucketErr.message);
  }

  const ext = (idPhoto.name.split(".").pop() ?? "jpg").toLowerCase();
  const storagePath = `${booking.client_id}/${bookingId}.${ext}`;
  const arrayBuffer = await idPhoto.arrayBuffer();

  const { error: uploadErr } = await supabase.storage
    .from("id-photos")
    .upload(storagePath, new Uint8Array(arrayBuffer), {
      contentType: idPhoto.type,
      upsert: true,
    });

  if (uploadErr) {
    console.error("[consent-forms] upload error:", uploadErr.message);
    return NextResponse.json(
      { error: `Failed to upload ID photo: ${uploadErr.message}` },
      { status: 503 }
    );
  }

  // Update client record with photo path
  await supabase
    .from("clients")
    .update({ id_photo_url: storagePath } as never)
    .eq("id", booking.client_id);

  // Insert consent form
  const { error: consentErr } = await supabase
    .from("consent_forms")
    .insert({
      booking_id: bookingId,
      client_id: booking.client_id,
      is_minor: isMinor,
      guardian_name: guardianName,
      guardian_signature: guardianSignature,
      client_signature: signature,
      id_photo_url: storagePath,
      state_template: stateTemplate,
    } as never);

  if (consentErr) {
    return NextResponse.json(
      { error: "Failed to save consent form: " + consentErr.message },
      { status: 500 }
    );
  }

  // Confirm booking (handles webhook-not-yet-fired case)
  await supabase
    .from("bookings")
    .update({
      status: "confirmed",
      deposit_paid: true,
      deposit_paid_at: new Date().toISOString(),
    } as never)
    .eq("id", bookingId)
    .neq("status" as never, "confirmed");

  return NextResponse.json({ success: true, bookingId });
}
