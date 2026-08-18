import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStripeConnectEnabled } from "@/lib/stripe/connect";
import { buildSmsMessage, trySendSms } from "@/lib/twilio/client";
import { sendBookingConfirmationEmail, sendRemainderReceivedEmail } from "@/lib/email";
import { getBalanceDueCents } from "@/lib/booking-balance";
import { isForwardSystemTransition } from "@/lib/pipeline";

// Connect-events webhook — deliberately a SEPARATE endpoint/file from the
// existing app/api/stripe/webhook/route.ts (the live platform-account
// webhook), never touched by this work. Two independent registered Stripe
// Dashboard endpoints, two independent signing secrets: a connected-account
// event can never be misrouted into the platform webhook handler or vice
// versa. See MASTER_PLAN.md's payment architecture plan, Section 7.
//
// Studio identity for every event comes from Stripe's own `event.account`
// (the connected account that generated it) — NEVER from client-suppliable
// session metadata alone. This is the strongest isolation guarantee
// available: it doesn't depend on any caller-supplied id at all, extending
// the same discipline as this session's earlier cross-studio IDOR fixes
// (derive identity from a verified source, not a request parameter).
//
// Gated behind isStripeConnectEnabled(): with the flag off (the production
// default), this returns 503 immediately without verifying a signature or
// touching any `studios.stripe_connect_*` column — safe to deploy today
// with zero effect, since this endpoint also isn't registered in the
// Stripe Dashboard yet (Siam hasn't done that — see the activation
// checklist).
export async function POST(request: NextRequest) {
  if (!isStripeConnectEnabled()) {
    return NextResponse.json({ error: "Stripe Connect is not yet enabled" }, { status: 503 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  if (!process.env.STRIPE_CONNECT_WEBHOOK_SECRET) {
    console.error("[stripe/connect-webhook] STRIPE_CONNECT_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_CONNECT_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe/connect-webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Connect events carry the originating connected account id here —
  // absent on ordinary platform-account events, which is exactly why this
  // must be a separate endpoint from the platform webhook.
  const connectedAccountId = (event as { account?: string }).account;
  if (!connectedAccountId) {
    console.error("[stripe/connect-webhook] event has no account context — id:", event.id, "type:", event.type);
    return NextResponse.json({ received: true });
  }

  const supabase = createAdminClient();

  if (event.type === "account.updated") {
    return handleAccountUpdated(supabase, connectedAccountId, event.data.object);
  }

  if (event.type === "checkout.session.completed") {
    return handleConnectedCheckoutCompleted(supabase, connectedAccountId, event.data.object);
  }

  return NextResponse.json({ received: true });
}

// ── account.updated — sync charges_enabled/payouts_enabled/details_submitted ──
async function handleAccountUpdated(
  supabase: ReturnType<typeof createAdminClient>,
  connectedAccountId: string,
  account: { charges_enabled?: boolean; payouts_enabled?: boolean; details_submitted?: boolean }
): Promise<NextResponse> {
  const { error } = await supabase
    .from("studios")
    .update({
      stripe_connect_charges_enabled: Boolean(account.charges_enabled),
      stripe_connect_payouts_enabled: Boolean(account.payouts_enabled),
      stripe_connect_details_submitted: Boolean(account.details_submitted),
      stripe_connect_updated_at: new Date().toISOString(),
    } as never)
    .eq("stripe_connected_account_id", connectedAccountId);

  if (error) {
    console.error("[stripe/connect-webhook] account.updated: studio update failed:", error.message);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ── checkout.session.completed (Connect) — reconcile the studio's own deposit/remainder charge ──
async function handleConnectedCheckoutCompleted(
  supabase: ReturnType<typeof createAdminClient>,
  connectedAccountId: string,
  session: { id: string; payment_intent: unknown; metadata: Record<string, string> | null }
): Promise<NextResponse> {
  const { data: studioRaw } = await supabase
    .from("studios")
    .select("id, name")
    .eq("stripe_connected_account_id", connectedAccountId)
    .maybeSingle();

  const studio = studioRaw as { id: string; name: string } | null;
  if (!studio) {
    console.error("[stripe/connect-webhook] no studio found for connected account:", connectedAccountId);
    return NextResponse.json({ received: true });
  }

  const depositPaymentId = session.metadata?.depositPaymentId;
  const customRequestId = session.metadata?.customRequestId;

  if (customRequestId) {
    return handleConnectedCustomRequestDeposit(supabase, studio, session, customRequestId);
  }

  if (!depositPaymentId) {
    console.error("[stripe/connect-webhook] checkout.session.completed with no recognised metadata — session:", session.id);
    return NextResponse.json({ received: true });
  }

  const { data: dpRaw } = await supabase
    .from("deposit_payments" as never)
    .select("id, booking_id, payment_status, payment_type")
    .eq("id", depositPaymentId)
    .maybeSingle();

  const dp = dpRaw as { id: string; booking_id: string; payment_status: string; payment_type: string } | null;
  if (!dp) {
    console.warn("[stripe/connect-webhook] no deposit_payment found — depositPaymentId:", depositPaymentId);
    return NextResponse.json({ received: true });
  }

  // Cross-studio protection: the booking this payment claims to belong to
  // must actually belong to the studio Stripe says generated this event.
  // A mismatch here means either a bug or something adversarial — either
  // way, this payment is never reconciled against the wrong studio's data.
  const { data: bookingRaw } = await supabase
    .from("bookings")
    .select("studio_id, client_id, artist_id, date, time, deposit_amount_cents, total_amount_cents, quote_amount_cents")
    .eq("id", dp.booking_id)
    .maybeSingle();

  const booking = bookingRaw as {
    studio_id: string; client_id: string; artist_id: string; date: string | null; time: string | null;
    deposit_amount_cents: number; total_amount_cents: number | null; quote_amount_cents: number | null;
  } | null;

  if (!booking) {
    console.error("[stripe/connect-webhook] booking not found — id:", dp.booking_id);
    return NextResponse.json({ received: true });
  }

  if (booking.studio_id !== studio.id) {
    console.error(
      "[stripe/connect-webhook] STUDIO MISMATCH — refusing to reconcile. connected account:", connectedAccountId,
      "resolved studio:", studio.id, "booking's actual studio:", booking.studio_id, "booking:", dp.booking_id
    );
    return NextResponse.json({ received: true });
  }

  if (dp.payment_status === "paid") {
    return NextResponse.json({ received: true }); // idempotent replay
  }

  const now = new Date().toISOString();

  const { error: dpUpdateError } = await supabase
    .from("deposit_payments" as never)
    .update({
      payment_status: "paid",
      stripe_payment_intent_id: session.payment_intent as string,
      paid_at: now,
    } as never)
    .eq("id", dp.id);

  if (dpUpdateError) {
    console.error("[stripe/connect-webhook] deposit_payments update failed:", dpUpdateError.message);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  if (dp.payment_type === "remainder") {
    return handleRemainderCollected(supabase, dp.booking_id, studio.name, now);
  }

  const hasSchedule = Boolean(booking.date);
  const nextBookingStatus = hasSchedule ? "confirmed" : "awaiting_schedule";

  const { error: bookingUpdateError } = await supabase
    .from("bookings")
    .update({ status: nextBookingStatus, deposit_paid: true, deposit_paid_at: now } as never)
    .eq("id", dp.booking_id);

  if (bookingUpdateError) {
    console.error("[stripe/connect-webhook] bookings update failed:", bookingUpdateError.message);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  // Same defense-in-depth as the platform webhook's handleDepositPayment:
  // only ever advance a linked consultation forward, never regress it.
  const { data: linkedConsult } = await supabase
    .from("consultations")
    .select("id, status")
    .eq("booking_id" as never, dp.booking_id)
    .maybeSingle();
  const linked = linkedConsult as { id: string; status: string } | null;

  if (linked && isForwardSystemTransition(linked.status, "deposit_paid")) {
    await supabase.from("consultations").update({ status: "deposit_paid" } as never).eq("id" as never, linked.id);
  }

  if (hasSchedule) {
    const [{ data: clientData }, { data: artistData }, { data: studioAddrData }] = await Promise.all([
      supabase.from("clients").select("full_name, email, phone").eq("id", booking.client_id).maybeSingle(),
      supabase.from("artists").select("name").eq("id", booking.artist_id).maybeSingle(),
      supabase.from("studios").select("address").eq("id", studio.id).maybeSingle(),
    ]);

    const client = clientData as { full_name: string; email: string; phone: string } | null;
    const artistName = (artistData as { name: string } | null)?.name ?? "your artist";
    const studioAddress = (studioAddrData as { address: string | null } | null)?.address ?? null;

    if (client?.phone) {
      void trySendSms(client.phone, buildSmsMessage("booking_confirmed", studio.name));
    }
    if (client?.email && booking.date && booking.time) {
      const formattedDate = new Date(booking.date + "T12:00:00").toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric",
      });
      try {
        await sendBookingConfirmationEmail({
          to: client.email,
          clientName: client.full_name,
          artistName,
          studioName: studio.name,
          studioAddress,
          date: formattedDate,
          time: booking.time.slice(0, 5),
          depositAmountCents: booking.deposit_amount_cents,
        });
      } catch (err) {
        console.error("[stripe/connect-webhook] confirmation email failed:", err);
      }
    }
  }

  console.log("[stripe/connect-webhook] deposit confirmed — booking:", dp.booking_id, "| studio:", studio.id);
  return NextResponse.json({ received: true });
}

// ── checkout.session.completed (Connect) — custom_requests deposit branch ──
// Mirrors app/api/stripe/webhook/route.ts's own Branch B (same RPC, same
// atomic create-booking+deposit+link-request semantics), with one addition:
// studio ownership is verified against Stripe's own event.account BEFORE
// the RPC runs, not just trusted from metadata.
async function handleConnectedCustomRequestDeposit(
  supabase: ReturnType<typeof createAdminClient>,
  studio: { id: string; name: string },
  session: { id: string; payment_intent: unknown },
  customRequestId: string
): Promise<NextResponse> {
  const { data: crRaw } = await supabase
    .from("custom_requests")
    .select("studio_id, status")
    .eq("id", customRequestId)
    .maybeSingle();

  const cr = crRaw as { studio_id: string; status: string } | null;
  if (!cr) {
    console.error("[stripe/connect-webhook] custom_request not found — id:", customRequestId);
    return NextResponse.json({ received: true });
  }

  if (cr.studio_id !== studio.id) {
    console.error(
      "[stripe/connect-webhook] STUDIO MISMATCH on custom_request — refusing to reconcile. resolved studio:",
      studio.id, "request's actual studio:", cr.studio_id, "request:", customRequestId
    );
    return NextResponse.json({ received: true });
  }

  if (cr.status !== "quoted") {
    console.log("[stripe/connect-webhook] custom_request fast-path skip — status:", cr.status, "id:", customRequestId);
    return NextResponse.json({ received: true });
  }

  const { data: rpcRaw, error: rpcError } = await supabase.rpc("process_custom_request_deposit" as never, {
    p_stripe_session_id: session.id,
    p_custom_request_id: customRequestId,
    p_payment_intent_id: session.payment_intent as string,
    p_paid_at: new Date().toISOString(),
  } as never);

  if (rpcError) {
    console.error("[stripe/connect-webhook] custom_request RPC error:", rpcError);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  const result = rpcRaw as { outcome: string; booking_id?: string } | null;
  console.log("[stripe/connect-webhook] custom_request deposit outcome:", result?.outcome, "| id:", customRequestId);
  return NextResponse.json({ received: true });
}

async function handleRemainderCollected(
  supabase: ReturnType<typeof createAdminClient>,
  bookingId: string,
  studioName: string,
  paidAt: string
): Promise<NextResponse> {
  const { error: updateError } = await supabase
    .from("bookings")
    .update({ remainder_collected: true, remainder_collected_at: paidAt } as never)
    .eq("id", bookingId);

  if (updateError) {
    console.error("[stripe/connect-webhook] remainder bookings update failed:", updateError.message);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  const { data: bookingRow } = await supabase
    .from("bookings")
    .select("client_id, deposit_amount_cents, total_amount_cents, quote_amount_cents")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingRow) {
    const booking = bookingRow as {
      client_id: string; deposit_amount_cents: number;
      total_amount_cents: number | null; quote_amount_cents: number | null;
    };
    const { data: clientData } = await supabase
      .from("clients")
      .select("full_name, email, phone")
      .eq("id", booking.client_id)
      .maybeSingle();
    const client = clientData as { full_name: string; email: string; phone: string } | null;
    const balanceDueCents = getBalanceDueCents(booking) ?? 0;

    if (client?.phone) {
      void trySendSms(client.phone, buildSmsMessage("remainder_received", studioName));
    }
    if (client?.email) {
      void sendRemainderReceivedEmail({ to: client.email, clientName: client.full_name, studioName, balanceDueCents });
    }
  }

  console.log("[stripe/connect-webhook] remainder collected — booking:", bookingId);
  return NextResponse.json({ received: true });
}
