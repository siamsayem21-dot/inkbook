"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioId } from "@/lib/auth/config";
import { getStripe } from "@/lib/stripe/client";
import { revalidatePath } from "next/cache";
import { buildSmsMessage, trySendSms } from "@/lib/twilio/client";
import { sendSessionScheduledEmail, sendBookingCancelledEmail, sendAftercareEmail } from "@/lib/email";
import { isReadyToConfirm, bookingHasConsent } from "@/lib/booking-lifecycle";
import { getBookingTotalCents, getBalanceDueCents } from "@/lib/booking-balance";
import { isAtMonthlyCap } from "@/lib/waitlist";
import { sendRemainderPaymentRequest } from "@/lib/remainder-payment";

export async function cancelBooking(bookingId: string): Promise<{ error?: string }> {
  const studioId = await getStudioId();
  if (!studioId) return { error: "Unauthorized" };

  const supabase = createAdminClient();

  // Verify the booking belongs to the authenticated user's studio before mutating
  const { data: bookingCheck } = await supabase
    .from("bookings")
    .select("studio_id, client_id")
    .eq("id", bookingId)
    .maybeSingle();

  const check = bookingCheck as { studio_id: string; client_id: string } | null;
  if (!check) return { error: "Booking not found" };
  if (check.studio_id !== studioId) return { error: "Unauthorized" };

  const { data: updatedRows, error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" } as never)
    .eq("id", bookingId)
    .neq("status", "cancelled")
    .select("id");

  if (error) {
    console.error("[cancelBooking]", error.message);
    return { error: "Failed to cancel booking — please try again" };
  }

  revalidatePath("/owner/bookings");
  revalidatePath(`/owner/bookings/${bookingId}`);

  // Only notify on an actual cancelled -> cancelled-now transition — the
  // .neq guard above means updatedRows is empty if it was already cancelled.
  if ((updatedRows ?? []).length > 0) {
    const [{ data: clientRow }, { data: studioRow }] = await Promise.all([
      supabase.from("clients").select("full_name, email, phone").eq("id", check.client_id).maybeSingle(),
      supabase.from("studios").select("name").eq("id", studioId).maybeSingle(),
    ]);

    const client = clientRow as { full_name: string; email: string; phone: string } | null;
    const studioName = (studioRow as { name: string } | null)?.name ?? "the studio";

    if (client?.phone) {
      void trySendSms(client.phone, buildSmsMessage("cancellation", studioName));
    }
    if (client?.email) {
      void sendBookingCancelledEmail({ to: client.email, clientName: client.full_name, studioName });
    }
  }

  return {};
}

// Assigns a date/time to an awaiting_schedule booking. Only confirms it if
// consent has already been signed (Phase C Feature 1 rule — see
// lib/booking-lifecycle.ts); otherwise the booking stays awaiting_schedule
// until the client signs consent, at which point POST /api/consent-forms
// performs the same check and confirms it there instead.
export async function assignSchedule(
  bookingId: string,
  date: string,
  time: string
): Promise<{ error?: string; confirmed?: boolean }> {
  const studioId = await getStudioId();
  if (!studioId) return { error: "Unauthorized" };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "date is required (YYYY-MM-DD)" };
  if (!/^\d{2}:\d{2}$/.test(time)) return { error: "time is required (HH:MM)" };
  if (date < new Date().toISOString().split("T")[0]) return { error: "Date cannot be in the past" };

  const supabase = createAdminClient();

  const { data: bookingRaw } = await supabase
    .from("bookings")
    .select("id, studio_id, artist_id, status, client_id, deposit_amount_cents, total_amount_cents, quote_amount_cents")
    .eq("id", bookingId)
    .maybeSingle();

  const booking = bookingRaw as {
    id: string;
    studio_id: string;
    artist_id: string | null;
    status: string;
    client_id: string;
    deposit_amount_cents: number;
    total_amount_cents: number | null;
    quote_amount_cents: number | null;
  } | null;

  if (!booking) return { error: "Booking not found" };
  if (booking.studio_id !== studioId) return { error: "Booking not found" };
  if (booking.status !== "awaiting_schedule") {
    return { error: `Booking is already in '${booking.status}' state` };
  }
  if (!booking.artist_id) return { error: "No artist assigned to this booking" };

  // Conflict check — same shape as /api/custom-requests/[id]/schedule.
  const { data: conflictRows } = await supabase
    .from("bookings")
    .select("id")
    .eq("artist_id", booking.artist_id)
    .eq("date", date)
    .eq("time", time)
    .in("status", ["confirmed", "awaiting_schedule"])
    .neq("id", bookingId);

  if ((conflictRows ?? []).length > 0) {
    return { error: "Artist already has a booking at that date and time" };
  }

  // Monthly booking cap (Phase C Feature 6) — checked against the month of
  // the date being assigned, not "this month". This client already has a
  // paid deposit, so hitting the cap means picking a different month, not
  // losing the booking.
  const { data: artistCapRow } = await supabase
    .from("artists")
    .select("name, monthly_booking_cap")
    .eq("id", booking.artist_id)
    .maybeSingle();
  const artistForCap = artistCapRow as { name: string; monthly_booking_cap: number } | null;
  if (artistForCap && (await isAtMonthlyCap(supabase, booking.artist_id, artistForCap.monthly_booking_cap, date))) {
    return { error: `${artistForCap.name} is already at capacity for that month — choose a different date.` };
  }

  const hasConsent = await bookingHasConsent(supabase, bookingId);
  const shouldConfirm = isReadyToConfirm(true, hasConsent);

  const { error: updateError } = await supabase
    .from("bookings")
    .update({
      date,
      time,
      ...(shouldConfirm ? { status: "confirmed" } : {}),
    } as never)
    .eq("id", bookingId)
    .eq("status", "awaiting_schedule");

  if (updateError) {
    console.error("[assignSchedule]", updateError.message);
    return { error: "Failed to assign schedule — please try again" };
  }

  // Keep a linked custom_request in sync — but only once the booking is
  // actually confirmed, matching what /api/custom-requests/[id]/schedule
  // means by "scheduled" (booking confirmed with a real date/time).
  if (shouldConfirm) {
    await supabase
      .from("custom_requests")
      .update({ status: "scheduled" } as never)
      .eq("booking_id", bookingId)
      .eq("status", "accepted");
  }

  revalidatePath("/owner/bookings");
  revalidatePath(`/owner/bookings/${bookingId}`);

  // Still waiting on consent — no "your session is confirmed" notification
  // yet, since it isn't actually confirmed.
  if (!shouldConfirm) return {};

  const [{ data: clientRow }, { data: artistRow }, { data: studioRow }] = await Promise.all([
    supabase.from("clients").select("full_name, email, phone").eq("id", booking.client_id).maybeSingle(),
    supabase.from("artists").select("name").eq("id", booking.artist_id).maybeSingle(),
    supabase.from("studios").select("name, address").eq("id", studioId).maybeSingle(),
  ]);

  const client = clientRow as { full_name: string; email: string; phone: string } | null;
  const artistName = (artistRow as { name: string } | null)?.name ?? "your artist";
  const studioName = (studioRow as { name: string; address: string | null } | null)?.name ?? "the studio";
  const studioAddress = (studioRow as { name: string; address: string | null } | null)?.address ?? null;

  const formattedDate = new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  if (client?.phone) {
    void trySendSms(
      client.phone,
      `Your session with ${artistName} at ${studioName} is confirmed for ${formattedDate} at ${time}. See you there!`
    );
  }

  if (client?.email) {
    void sendSessionScheduledEmail({
      to: client.email,
      clientName: client.full_name,
      artistName,
      studioName,
      studioAddress,
      date: formattedDate,
      time,
      depositAmountCents: booking.deposit_amount_cents,
      totalAmountCents: getBookingTotalCents(booking) ?? booking.deposit_amount_cents,
    });
  }

  return { confirmed: true };
}

// Marks a confirmed session as completed. Guards on BOTH status === "confirmed"
// (rules out unscheduled/cancelled/no_show bookings — Phase C Feature 1 rule 2)
// AND consent being signed — re-checked explicitly here rather than trusting
// status alone, because the classic self-serve flow (unchanged by this
// feature) can still land a booking in "confirmed" before consent is
// collected; this action must never let that booking be marked completed
// without consent regardless of how it became confirmed (rule 1).
export async function markCompleted(bookingId: string): Promise<{ error?: string }> {
  const studioId = await getStudioId();
  if (!studioId) return { error: "Unauthorized" };

  const supabase = createAdminClient();

  const { data: bookingCheck } = await supabase
    .from("bookings")
    .select("studio_id, status, client_id, artist_id")
    .eq("id", bookingId)
    .maybeSingle();

  const check = bookingCheck as { studio_id: string; status: string; client_id: string; artist_id: string } | null;
  if (!check) return { error: "Booking not found" };
  if (check.studio_id !== studioId) return { error: "Unauthorized" };
  if (check.status !== "confirmed") {
    return { error: "Only confirmed, scheduled bookings can be marked completed" };
  }

  const hasConsent = await bookingHasConsent(supabase, bookingId);
  if (!hasConsent) {
    return { error: "Consent form must be signed before this session can be marked completed" };
  }

  const completedAt = new Date().toISOString();
  const { error } = await supabase
    .from("bookings")
    .update({ status: "completed", completed_at: completedAt } as never)
    .eq("id", bookingId)
    .eq("status", "confirmed");

  if (error) {
    console.error("[markCompleted]", error.message);
    return { error: "Failed to mark session completed — please try again" };
  }

  revalidatePath("/owner/bookings");
  revalidatePath(`/owner/bookings/${bookingId}`);

  // Aftercare notification (Phase C Feature 4) — fire-and-forget, same
  // convention as every other notification in this file. The completed
  // transition above is guaranteed single-fire (the .eq("status","confirmed")
  // optimistic lock is the only place in the codebase that ever writes
  // status: "completed"), so no separate dedupe flag is needed here.
  const [{ data: clientData }, { data: artistData }, { data: studioData }] = await Promise.all([
    supabase.from("clients").select("full_name, email, phone").eq("id", check.client_id).maybeSingle(),
    supabase.from("artists").select("name").eq("id", check.artist_id).maybeSingle(),
    supabase.from("studios").select("name").eq("id", studioId).maybeSingle(),
  ]);

  const client = clientData as { full_name: string; email: string; phone: string } | null;
  const artistName = (artistData as { name: string } | null)?.name ?? "your artist";
  const studioName = (studioData as { name: string } | null)?.name ?? "the studio";

  if (client?.phone) {
    void trySendSms(client.phone, buildSmsMessage("aftercare", studioName));
  }
  if (client?.email) {
    void sendAftercareEmail({ to: client.email, clientName: client.full_name, studioName, artistName });
  }

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
  const studioId = await getStudioId();
  if (!studioId) return { error: "Unauthorized" };

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

  // Verify the booking belongs to the authenticated studio before proceeding.
  // Returns "not found" rather than "unauthorized" to avoid leaking that the
  // booking ID is valid for a different studio.
  if (booking.studio_id !== studioId) return { error: "Booking not found" };

  const { data: studioRaw } = await supabase
    .from("studios")
    .select("name, subdomain")
    .eq("id", studioId)
    .single();

  const studioName      = (studioRaw as { name: string; subdomain: string } | null)?.name      ?? "Studio";
  const studioSubdomain = (studioRaw as { name: string; subdomain: string } | null)?.subdomain ?? null;
  const artistName = booking.artists?.name ?? "Artist";
  const clientEmail = booking.clients?.email;

  // ── 2. Reuse existing open Stripe session if one exists ───────────────────
  // Run a filtered query for this booking's pending record with a session
  const { data: existingRows } = (await supabase
    .from("deposit_payments" as never)
    .select("id, stripe_checkout_session_id")
    .eq("booking_id", bookingId)
    .eq("payment_type", "deposit")
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
      .eq("payment_type", "deposit")
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
          payment_type: "deposit",
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
      // After payment, send the client to the consent form page.
      // Fall back to the owner dashboard only if the studio subdomain is unavailable.
      success_url: studioSubdomain
        ? `${baseUrl}/book/${studioSubdomain}/${booking.artist_id}/book/consent?booking_id=${bookingId}`
        : `${baseUrl}/owner/bookings/${bookingId}?deposit=paid`,
      cancel_url: studioSubdomain
        ? `${baseUrl}/book/${studioSubdomain}/${booking.artist_id}/book/deposit?booking_id=${bookingId}&cancelled=true`
        : `${baseUrl}/owner/bookings/${bookingId}?deposit=cancelled`,
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

// Generates (or reuses) a Stripe Checkout link for the remaining balance on
// a booking. Unlike sendDepositRequest() above — which hand-rolls Stripe
// session creation because it needs a special post-payment redirect to the
// consent page — this reuses getOrCreateDepositCheckoutSession() as-is
// (paymentType: "remainder"), since a remainder payment has no further
// booking-lifecycle step after it; there's nothing special-case to hand-roll.
export async function requestRemainderPayment(
  bookingId: string
): Promise<{ checkoutUrl?: string; error?: string }> {
  const studioId = await getStudioId();
  if (!studioId) return { error: "Unauthorized" };

  const supabase = createAdminClient();

  const { data: bookingRaw, error: bookingError } = await supabase
    .from("bookings")
    .select(
      "id, studio_id, artist_id, deposit_amount_cents, total_amount_cents, quote_amount_cents, " +
        "remainder_collected, clients(email, full_name, phone), artists(name)"
    )
    .eq("id", bookingId)
    .single();

  if (bookingError || !bookingRaw) return { error: "Booking not found" };

  const booking = bookingRaw as {
    id: string;
    studio_id: string;
    artist_id: string;
    deposit_amount_cents: number;
    total_amount_cents: number | null;
    quote_amount_cents: number | null;
    remainder_collected: boolean;
    clients: { email: string; full_name: string; phone: string } | null;
    artists: { name: string } | null;
  };

  // Same "return not-found rather than unauthorized" reasoning as sendDepositRequest.
  if (booking.studio_id !== studioId) return { error: "Booking not found" };
  if (booking.remainder_collected) return { error: "Remaining balance has already been collected" };

  const balanceDueCents = getBalanceDueCents(booking);
  if (balanceDueCents === null) {
    return { error: "This booking has no agreed total price — nothing to collect" };
  }
  if (balanceDueCents <= 0) {
    return { error: "There is no remaining balance to collect" };
  }

  const { data: studioRaw } = await supabase.from("studios").select("name").eq("id", studioId).single();
  const studioName = (studioRaw as { name: string } | null)?.name ?? "Studio";
  const artistName = booking.artists?.name ?? "Artist";

  return sendRemainderPaymentRequest({
    bookingId,
    artistId: booking.artist_id,
    artistName,
    studioName,
    balanceDueCents,
    clientEmail: booking.clients?.email,
    clientName: booking.clients?.full_name,
    clientPhone: booking.clients?.phone,
  });
}
