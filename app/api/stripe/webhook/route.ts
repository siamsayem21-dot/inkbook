import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSmsMessage, trySendSms } from "@/lib/twilio/client";
import { sendBookingConfirmationEmail, sendCustomRequestAcceptedEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  // ── 1. Read raw body — must be text/buffer before any parsing ────────────
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  if (!process.env.STRIPE_DEPOSIT_WEBHOOK_SECRET) {
    console.error("[stripe/webhook] STRIPE_DEPOSIT_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  // ── 2. Verify Stripe signature ────────────────────────────────────────────
  // constructEvent throws if the signature doesn't match — never skip this.
  let event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_DEPOSIT_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe/webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // ── 3. Route by event type ────────────────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const depositPaymentId = session.metadata?.depositPaymentId;
    const customRequestId  = session.metadata?.customRequestId;
    const bookingId        = session.metadata?.bookingId;

    // ── Branch A: new deposit_payments flow ──────────────────────────────
    // Triggered when the owner uses "Send Deposit Request" from the dashboard.
    // depositPaymentId is always set by sendDepositRequest() in actions.ts.
    if (depositPaymentId) {
      return handleDepositPayment(session);
    }

    // ── Branch B: custom request deposit ─────────────────────────────────
    if (customRequestId) {
      const supabase = createAdminClient();

      // Step 1: mark accepted + record payment intent
      await supabase
        .from("custom_requests")
        .update({
          status: "accepted",
          stripe_payment_intent_id: session.payment_intent as string,
        } as never)
        .eq("id", customRequestId);

      // Step 2: fetch request data needed for notifications
      const { data: crRaw } = await supabase
        .from("custom_requests")
        .select("client_name, client_email, client_phone, studio_id, deposit_amount")
        .eq("id", customRequestId)
        .single();

      const cr = crRaw as {
        client_name: string;
        client_email: string;
        client_phone: string;
        studio_id: string;
        deposit_amount: number | null;
      } | null;

      if (cr) {
        const { data: studioRaw } = await supabase
          .from("studios")
          .select("name, subdomain")
          .eq("id", cr.studio_id)
          .single();

        const studioName = (studioRaw as { name: string; subdomain: string } | null)?.name ?? "Studio";
        const studioSlug = (studioRaw as { name: string; subdomain: string } | null)?.subdomain ?? "";

        // Step 3: SMS confirmation (non-blocking)
        void trySendSms(
          cr.client_phone,
          `Your custom tattoo deposit at ${studioName} is confirmed. We'll be in touch to schedule your session.`
        );

        // Step 4: email confirmation (non-blocking)
        void sendCustomRequestAcceptedEmail({
          to:            cr.client_email,
          clientName:    cr.client_name,
          studioName,
          studioSlug,
          requestId:     customRequestId,
          depositAmount: cr.deposit_amount ?? 0,
        });
      }

      return NextResponse.json({ received: true });
    }

    // ── Branch C: legacy booking deposit (existing flow — unchanged) ──────
    // Kept for sessions created before deposit_payments was introduced.
    if (bookingId) {
      const supabase = createAdminClient();
      const now = new Date().toISOString();

      await Promise.all([
        supabase
          .from("bookings")
          .update({
            status: "confirmed",
            deposit_paid: true,
            deposit_paid_at: now,
          } as never)
          .eq("id", bookingId),
        supabase
          .from("deposits")
          .update({
            status: "paid",
            paid_at: now,
            stripe_payment_intent_id: session.payment_intent as string,
          } as never)
          .eq("booking_id", bookingId),
      ]);

      // Send booking_confirmed SMS + email (non-blocking)
      const { data: bookingRow } = await supabase
        .from("bookings")
        .select("client_id, artist_id, studio_id, date, time, deposit_amount_cents")
        .eq("id", bookingId)
        .single();

      if (bookingRow) {
        const { client_id, artist_id, studio_id, date, time, deposit_amount_cents } = bookingRow as {
          client_id: string;
          artist_id: string;
          studio_id: string;
          date: string;
          time: string;
          deposit_amount_cents: number;
        };

        const [{ data: clientData }, { data: artistData }, { data: studioData }] = await Promise.all([
          supabase.from("clients").select("full_name, email, phone").eq("id", client_id).single(),
          supabase.from("artists").select("name").eq("id", artist_id).single(),
          supabase.from("studios").select("name, address").eq("id", studio_id).single(),
        ]);

        const client     = clientData as { full_name: string; email: string; phone: string } | null;
        const artistName = (artistData as { name: string } | null)?.name ?? "your artist";
        const studioName = (studioData as { name: string; address: string | null } | null)?.name;
        const studioAddr = (studioData as { name: string; address: string | null } | null)?.address ?? null;

        if (client?.phone && studioName) {
          void trySendSms(client.phone, buildSmsMessage("booking_confirmed", studioName));
        }

        if (client?.email && studioName) {
          const formattedDate = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
            weekday: "long", month: "long", day: "numeric",
          });
          try {
            await sendBookingConfirmationEmail({
              to: client.email,
              clientName: client.full_name,
              artistName,
              studioName,
              studioAddress: studioAddr,
              date: formattedDate,
              time: time.slice(0, 5),
              depositAmountCents: deposit_amount_cents,
            });
          } catch (err) {
            console.error("[stripe/webhook] email send failed:", err);
          }
        }
      }

      return NextResponse.json({ received: true });
    }

    console.error("[stripe/webhook] checkout.session.completed — no recognised metadata keys", session.id);
  }

  return NextResponse.json({ received: true });
}

// ── Handler: deposit_payments flow ───────────────────────────────────────────
// Owns ALL checkout.session.completed events that carry metadata.depositPaymentId.
// /api/billing/webhook skips those events entirely (routing boundary enforced there).
//
// Lookup strategy: prefer depositPaymentId from metadata (always present, direct PK)
// and fall back to stripe_checkout_session_id for any edge case where metadata is
// missing (e.g. legacy resent events). This makes the handler resilient to timing
// gaps where sendDepositRequest() hasn't yet persisted the session ID to the DB.
async function handleDepositPayment(
  session: { id: string; payment_intent: unknown; metadata: Record<string, string> | null }
): Promise<NextResponse> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // ── Step 1: find deposit_payment ─────────────────────────────────────────
  // Primary: look up by depositPaymentId in metadata (direct PK, always reliable).
  // Fallback: look up by stripe_checkout_session_id (covers legacy/re-sent events).
  const depositPaymentId = session.metadata?.depositPaymentId ?? null;

  let dpRows: Array<{ id: string; booking_id: string; payment_status: string }> | null = null;
  let dpError: unknown = null;

  if (depositPaymentId) {
    const result = (await supabase
      .from("deposit_payments" as never)
      .select("id, booking_id, payment_status")
      .eq("id", depositPaymentId)
      .limit(1)) as {
      data: Array<{ id: string; booking_id: string; payment_status: string }> | null;
      error: unknown;
    };
    dpRows = result.data;
    dpError = result.error;
  } else {
    const result = (await supabase
      .from("deposit_payments" as never)
      .select("id, booking_id, payment_status")
      .eq("stripe_checkout_session_id", session.id)
      .limit(1)) as {
      data: Array<{ id: string; booking_id: string; payment_status: string }> | null;
      error: unknown;
    };
    dpRows = result.data;
    dpError = result.error;
  }

  if (dpError) {
    console.error("[stripe/webhook] deposit_payments lookup failed:", dpError);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  const dp = dpRows?.[0];

  if (!dp) {
    console.warn("[stripe/webhook] no deposit_payment found — depositPaymentId:", depositPaymentId, "session:", session.id);
    return NextResponse.json({ received: true });
  }

  // Idempotency guard — already processed (Stripe may deliver the event more than once)
  if (dp.payment_status === "paid") {
    return NextResponse.json({ received: true });
  }

  // ── Step 2: update deposit_payments ──────────────────────────────────────
  // Uses the typed table (no cast) — the cast on the select above is needed only for
  // the PostgREST select-shape inference; the update reads the proper Database type.
  const { error: dpUpdateError } = await (supabase
    .from("deposit_payments") as ReturnType<typeof supabase.from>)
    .update({
      payment_status:           "paid",
      stripe_payment_intent_id: session.payment_intent as string,
      paid_at:                  now,
    })
    .eq("id", dp.id);

  if (dpUpdateError) {
    console.error("[stripe/webhook] deposit_payments update failed:", dpUpdateError);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  // ── Step 3: confirm the booking ───────────────────────────────────────────
  const { error: bookingUpdateError } = await supabase
    .from("bookings")
    .update({
      status:          "confirmed",
      deposit_paid:    true,
      deposit_paid_at: now,
    } as never)
    .eq("id", dp.booking_id);

  if (bookingUpdateError) {
    console.error("[stripe/webhook] bookings update failed:", bookingUpdateError);
    // deposit_payments is already marked paid — return 500 so Stripe retries
    // and we can reconcile the booking update on the next attempt.
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  // ── Step 4: advance consultation pipeline to deposit_paid ─────────────────
  // No-op if no consultation is linked to this booking (e.g. direct self-serve
  // bookings don't have a consultation row). Safe to run unconditionally.
  await supabase
    .from("consultations")
    .update({ status: "deposit_paid" } as never)
    .eq("booking_id" as never, dp.booking_id);

  // ── Step 5: send SMS + email confirmation ────────────────────────────────
  const { data: bookingRow } = await supabase
    .from("bookings")
    .select("client_id, artist_id, studio_id, date, time, deposit_amount_cents")
    .eq("id", dp.booking_id)
    .single();

  if (bookingRow) {
    const { client_id, artist_id, studio_id, date, time, deposit_amount_cents } = bookingRow as {
      client_id: string;
      artist_id: string;
      studio_id: string;
      date: string;
      time: string;
      deposit_amount_cents: number;
    };

    const [{ data: clientData }, { data: artistData }, { data: studioData }] = await Promise.all([
      supabase.from("clients").select("full_name, email, phone").eq("id", client_id).single(),
      supabase.from("artists").select("name").eq("id", artist_id).single(),
      supabase.from("studios").select("name, address").eq("id", studio_id).single(),
    ]);

    const client     = clientData as { full_name: string; email: string; phone: string } | null;
    const artistName = (artistData as { name: string } | null)?.name ?? "your artist";
    const studioName = (studioData as { name: string; address: string | null } | null)?.name;
    const studioAddr = (studioData as { name: string; address: string | null } | null)?.address ?? null;

    if (client?.phone && studioName) {
      void trySendSms(client.phone, buildSmsMessage("booking_confirmed", studioName));
    }

    if (client?.email && studioName) {
      const formattedDate = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric",
      });
      try {
        await sendBookingConfirmationEmail({
          to: client.email,
          clientName: client.full_name,
          artistName,
          studioName,
          studioAddress: studioAddr,
          date: formattedDate,
          time: time.slice(0, 5),
          depositAmountCents: deposit_amount_cents,
        });
      } catch (err) {
        console.error("[stripe/webhook] confirmation email failed (deposit_payments flow):", err);
      }
    }
  }

  console.log("[stripe/webhook] deposit confirmed — booking:", dp.booking_id, "| dp:", dp.id);
  return NextResponse.json({ received: true });
}
