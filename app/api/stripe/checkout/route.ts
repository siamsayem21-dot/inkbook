import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { bookingId, studioSlug, artistId } = body as {
    bookingId?: string;
    studioSlug?: string;
    artistId?: string;
  };

  if (!bookingId || !studioSlug || !artistId) {
    return NextResponse.json({ error: "Missing bookingId, studioSlug, or artistId" }, { status: 400 });
  }

  let stripe;
  try {
    stripe = getStripe();
  } catch {
    return NextResponse.json(
      { error: "Payment is not configured yet. Please contact the studio." },
      { status: 503 }
    );
  }

  const supabase = createAdminClient();

  const { data: bookingData } = await supabase
    .from("bookings")
    .select("id, deposit_amount_cents, studio_id, artist_id, status")
    .eq("id", bookingId)
    .single();

  const booking = bookingData as {
    id: string;
    deposit_amount_cents: number;
    studio_id: string;
    artist_id: string;
    status: string;
  } | null;

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.status !== "pending_deposit") {
    return NextResponse.json({ error: "Deposit already paid for this booking" }, { status: 409 });
  }

  // Return existing session if one was already created (prevents duplicate Stripe charges)
  const { data: existingDeposit } = await supabase
    .from("deposits")
    .select("stripe_checkout_session_id")
    .eq("booking_id" as never, bookingId)
    .maybeSingle();

  if (existingDeposit) {
    const dep = existingDeposit as { stripe_checkout_session_id: string };
    const existing = await stripe.checkout.sessions.retrieve(dep.stripe_checkout_session_id);
    if (existing.url) return NextResponse.json({ url: existing.url });
  }

  const [{ data: studioData }, { data: artistData }] = await Promise.all([
    supabase.from("studios").select("name").eq("id", booking.studio_id).single(),
    supabase.from("artists").select("name").eq("id", booking.artist_id).single(),
  ]);

  const studioName = (studioData as { name: string } | null)?.name ?? "Studio";
  const artistName = (artistData as { name: string } | null)?.name ?? "Artist";

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const bookingBase = `${baseUrl}/book/${studioSlug}/${artistId}/book`;

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Tattoo appointment deposit — ${artistName}`,
              description: `${studioName} · Non-refundable on no-show or late cancellation`,
            },
            unit_amount: booking.deposit_amount_cents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${bookingBase}/consent?booking_id=${bookingId}`,
      cancel_url: `${bookingBase}/deposit?booking_id=${bookingId}&cancelled=1`,
      metadata: { bookingId, studioSlug, artistId },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown Stripe error";
    return NextResponse.json({ error: `Stripe error: ${msg}` }, { status: 502 });
  }

  // Record the pending deposit
  await supabase.from("deposits").insert({
    booking_id: bookingId,
    amount_cents: booking.deposit_amount_cents,
    status: "pending",
    stripe_checkout_session_id: session.id,
  } as never);

  return NextResponse.json({ url: session.url });
}
