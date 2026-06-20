"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";
import { revalidatePath } from "next/cache";

export async function cancelBooking(bookingId: string): Promise<{ error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" } as never)
    .eq("id", bookingId);

  if (error) {
    console.error("[cancelBooking]", error.message);
    return { error: "Failed to cancel booking — please try again" };
  }

  revalidatePath("/owner/bookings");
  revalidatePath(`/owner/bookings/${bookingId}`);
  return {};
}

export type DepositPaymentRecord = {
  id: string;
  booking_id: string;
  amount_cents: number;
  payment_status: "pending" | "paid" | "refunded" | "kept";
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  paid_at: string | null;
  created_at: string;
};


export async function sendDepositRequest(
  bookingId: string
): Promise<{ checkoutUrl?: string; error?: string }> {
  const supabase = createAdminClient();

  // ── 1. Load booking + related names ──────────────────────────────────────
  const { data: bookingRaw, error: bookingError } = await supabase
    .from("bookings")
    .select("id, deposit_amount_cents, status, studio_id, artist_id, clients(email, full_name), artists(name)")
    .eq("id", bookingId)
    .single();

  if (bookingError || !bookingRaw) {
    return { error: "Booking not found" };
  }

  const booking = bookingRaw as {
    id: string;
    deposit_amount_cents: number;
    status: string;
    studio_id: string;
    artist_id: string;
    clients: { email: string; full_name: string } | null;
    artists: { name: string } | null;
  };

  const { data: studioRaw } = await supabase
    .from("studios")
    .select("name")
    .eq("id", booking.studio_id)
    .single();

  const studioName = (studioRaw as { name: string } | null)?.name ?? "Studio";
  const artistName = booking.artists?.name ?? "Artist";
  const clientEmail = booking.clients?.email;

  // ── 2. Reuse existing open Stripe session if one exists ───────────────────
  // Run a filtered query for this booking's pending record with a session
  const { data: existingRows } = (await supabase
    .from("deposit_payments" as never)
    .select("id, stripe_checkout_session_id")
    .eq("booking_id", bookingId)
    .eq("payment_status", "pending")
    .not("stripe_checkout_session_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)) as { data: Array<{ id: string; stripe_checkout_session_id: string }> | null };

  let depositPaymentId: string | null = null;

  if (existingRows && existingRows.length > 0) {
    const row = existingRows[0];
    depositPaymentId = row.id;

    // Check if the Stripe session is still open
    try {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(row.stripe_checkout_session_id);
      if (session.url && session.status === "open") {
        return { checkoutUrl: session.url };
      }
      // Session expired — clear it and fall through to create a fresh one
      await supabase
        .from("deposit_payments" as never)
        .update({ stripe_checkout_session_id: null } as never)
        .eq("id", row.id);
    } catch {
      // Stripe retrieval failed — fall through to create a new session
    }
  }

  // ── 3. Create deposit_payment row if none exists yet ──────────────────────
  if (!depositPaymentId) {
    const { data: pendingRows } = (await supabase
      .from("deposit_payments" as never)
      .select("id")
      .eq("booking_id", bookingId)
      .eq("payment_status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)) as { data: Array<{ id: string }> | null };

    if (pendingRows && pendingRows.length > 0) {
      depositPaymentId = pendingRows[0].id;
    } else {
      const { data: inserted, error: insertError } = (await supabase
        .from("deposit_payments" as never)
        .insert({
          booking_id: bookingId,
          amount_cents: booking.deposit_amount_cents,
          payment_status: "pending",
        } as never)
        .select("id")
        .single()) as { data: { id: string } | null; error: unknown };

      if (insertError || !inserted) {
        console.error("[sendDepositRequest] insert failed:", insertError);
        return { error: "Failed to create deposit payment record" };
      }
      depositPaymentId = inserted.id;
    }
  }

  // ── 4. Create Stripe Checkout Session ─────────────────────────────────────
  let stripe;
  try {
    stripe = getStripe();
  } catch {
    return { error: "Stripe is not configured. Add STRIPE_SECRET_KEY to your environment." };
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      ...(clientEmail ? { customer_email: clientEmail } : {}),
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Tattoo deposit — ${artistName}`,
              description: `${studioName} · Non-refundable on no-show or late cancellation`,
            },
            unit_amount: booking.deposit_amount_cents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${baseUrl}/owner/bookings/${bookingId}?deposit=paid`,
      cancel_url:  `${baseUrl}/owner/bookings/${bookingId}?deposit=cancelled`,
      metadata: {
        bookingId,
        depositPaymentId,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[sendDepositRequest] Stripe session creation failed:", msg);
    return { error: `Stripe error: ${msg}` };
  }

  // ── 5. Persist stripe_checkout_session_id ────────────────────────────────
  const { error: updateError } = await supabase
    .from("deposit_payments" as never)
    .update({ stripe_checkout_session_id: session.id } as never)
    .eq("id", depositPaymentId);

  if (updateError) {
    console.error("[sendDepositRequest] failed to save session id:", updateError);
    // Still return the URL — the user can proceed, webhook will reconcile later
  }

  return { checkoutUrl: session.url! };
}
