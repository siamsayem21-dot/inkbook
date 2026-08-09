import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSmsMessage, trySendSms } from "@/lib/twilio/client";
import {
  sendBookingConfirmationEmail,
  sendCustomRequestAcceptedEmail,
  sendOwnerDepositNotificationEmail,
  sendRemainderReceivedEmail,
} from "@/lib/email";
import { getBalanceDueCents } from "@/lib/booking-balance";
import { isForwardSystemTransition } from "@/lib/pipeline";

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

    // ── Branch A: deposit_payments flow ──────────────────────────────────
    if (depositPaymentId) {
      return handleDepositPayment(session);
    }

    // ── Branch B: custom request deposit ─────────────────────────────────
    if (customRequestId) {
      return handleCustomRequestDeposit(session, customRequestId, event.created);
    }

    // ── Branch C: legacy booking deposit (unchanged) ──────────────────────
    if (bookingId) {
      return handleLegacyBookingDeposit(session, bookingId);
    }

    console.error("[stripe/webhook] checkout.session.completed — no recognised metadata keys", session.id);
  }

  return NextResponse.json({ received: true });
}

// ── Branch B: Custom Request Deposit ─────────────────────────────────────────
// Triggered when a client pays a deposit for a custom request quote.
// Calls the process_custom_request_deposit RPC which atomically:
//   1. Creates the booking (status: awaiting_schedule)
//   2. Creates the deposit record (status: paid)
//   3. Updates custom_requests (status: accepted, booking_id linked)
// All writes are idempotent — safe for Stripe retries.
async function handleCustomRequestDeposit(
  session: { id: string; payment_intent: unknown; metadata: Record<string, string> | null },
  customRequestId: string,
  eventCreatedAt: number
): Promise<NextResponse> {
  const supabase = createAdminClient();

  // Pre-flight: fetch the custom request for notifications and the fast-path
  // status guard. If not found, log and return 200 — retrying won't help.
  const { data: crRaw } = await supabase
    .from("custom_requests")
    .select("studio_id, artist_id, client_name, client_email, client_phone, status, deposit_amount, quote_amount")
    .eq("id", customRequestId)
    .single();

  if (!crRaw) {
    console.error("[stripe/webhook] Branch B: custom_request not found — id:", customRequestId);
    return NextResponse.json({ received: true });
  }

  const cr = crRaw as {
    studio_id:      string;
    artist_id:      string | null;
    client_name:    string;
    client_email:   string;
    client_phone:   string;
    status:         string;
    deposit_amount: number | null;
    quote_amount:   number | null;
  };

  // Application-level status guard (fast path before hitting the RPC).
  // The RPC also checks this with a FOR UPDATE lock — this avoids the DB
  // round trip on the common case of a re-delivered event.
  if (cr.status !== "quoted") {
    console.log("[stripe/webhook] Branch B: fast-path skip — status:", cr.status, "id:", customRequestId);
    return NextResponse.json({ received: true });
  }

  // Compute the paid_at timestamp from the Stripe session creation time.
  const paidAt = new Date(eventCreatedAt * 1000).toISOString();

  // Call the atomic RPC — all DB writes happen inside a single transaction.
  // If this throws or returns an error, return 500 so Stripe retries.
  const { data: rpcRaw, error: rpcError } = await (supabase as ReturnType<typeof createAdminClient>)
    .rpc("process_custom_request_deposit" as never, {
      p_stripe_session_id:  session.id,
      p_custom_request_id:  customRequestId,
      p_payment_intent_id:  session.payment_intent as string,
      p_paid_at:            paidAt,
    } as never);

  if (rpcError) {
    console.error("[stripe/webhook] Branch B: RPC error:", rpcError);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  const result = rpcRaw as { outcome: string; booking_id?: string } | null;

  switch (result?.outcome) {
    case "already_processed":
      console.log("[stripe/webhook] Branch B: already processed — session:", session.id);
      return NextResponse.json({ received: true });

    case "conflict":
      // Status was not 'quoted' at the DB level — stale payment or duplicate.
      console.warn("[stripe/webhook] Branch B: conflict — status not quoted at DB level — id:", customRequestId);
      return NextResponse.json({ received: true });

    case "not_found":
      console.error("[stripe/webhook] Branch B: RPC not_found — id:", customRequestId);
      return NextResponse.json({ received: true });

    case "missing_artist":
      // Quote was sent without an artist assigned. The B2 fix prevents future
      // occurrences. Existing affected requests require manual studio intervention.
      console.error("[stripe/webhook] Branch B: missing_artist — id:", customRequestId, "— manual fix required");
      return NextResponse.json({ received: true });

    case "success":
      break; // continue to notifications

    default:
      console.error("[stripe/webhook] Branch B: unexpected RPC outcome:", result?.outcome);
      return NextResponse.json({ error: "Unexpected RPC outcome" }, { status: 500 });
  }

  // ── Notifications (non-blocking — failures are logged, not thrown) ────────
  // Fetch studio data for notification content and the owner email.
  const { data: studioRaw } = await supabase
    .from("studios")
    .select("name, subdomain, owner_id")
    .eq("id", cr.studio_id)
    .single();

  const studio = studioRaw as { name: string; subdomain: string; owner_id: string } | null;
  const studioName = studio?.name ?? "Studio";
  const studioSlug = studio?.subdomain ?? "";

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.inkbook.tech";

  // SMS to client
  void trySendSms(
    cr.client_phone,
    `Your custom tattoo deposit at ${studioName} is confirmed. We'll be in touch shortly to schedule your session.`
  );

  // Deposit confirmation email to client with full financial breakdown
  void sendCustomRequestAcceptedEmail({
    to:            cr.client_email,
    clientName:    cr.client_name,
    studioName,
    studioSlug,
    requestId:     customRequestId,
    depositAmount: cr.deposit_amount ?? 0,
    quoteAmount:   cr.quote_amount ?? undefined,
  });

  // Action-required email to studio owner
  if (studio?.owner_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: ownerUserData } = await (supabase as any).auth.admin.getUserById(studio.owner_id);
    const ownerEmail: string | undefined = ownerUserData?.user?.email;

    if (ownerEmail && cr.deposit_amount != null && cr.quote_amount != null) {
      void sendOwnerDepositNotificationEmail({
        to:            ownerEmail,
        clientName:    cr.client_name,
        studioName,
        depositAmount: cr.deposit_amount,
        quoteAmount:   cr.quote_amount,
        scheduleUrl:   `${baseUrl}/owner/requests/${customRequestId}`,
      });
    }
  }

  console.log("[stripe/webhook] Branch B: success — customRequestId:", customRequestId, "| bookingId:", result?.booking_id);
  return NextResponse.json({ received: true });
}

// ── Branch A: deposit_payments flow ──────────────────────────────────────────
async function handleDepositPayment(
  session: { id: string; payment_intent: unknown; metadata: Record<string, string> | null }
): Promise<NextResponse> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const depositPaymentId = session.metadata?.depositPaymentId ?? null;

  let dpRows: Array<{ id: string; booking_id: string; payment_status: string; payment_type: string }> | null = null;
  let dpError: unknown = null;

  if (depositPaymentId) {
    const result = (await supabase
      .from("deposit_payments" as never)
      .select("id, booking_id, payment_status, payment_type")
      .eq("id", depositPaymentId)
      .limit(1)) as {
      data: Array<{ id: string; booking_id: string; payment_status: string; payment_type: string }> | null;
      error: unknown;
    };
    dpRows = result.data;
    dpError = result.error;
  } else {
    const result = (await supabase
      .from("deposit_payments" as never)
      .select("id, booking_id, payment_status, payment_type")
      .eq("stripe_checkout_session_id", session.id)
      .limit(1)) as {
      data: Array<{ id: string; booking_id: string; payment_status: string; payment_type: string }> | null;
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

  if (dp.payment_status === "paid") {
    return NextResponse.json({ received: true });
  }

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

  // Remainder payments never touch the booking's status/deposit fields — that
  // lifecycle machinery (awaiting_schedule/confirmed, deposit_paid) is a
  // deposit-only concern. This just records collection and notifies.
  if (dp.payment_type === "remainder") {
    return handleRemainderPayment(supabase, dp.booking_id, now);
  }

  // Whether this booking already has a real date/time decides what "paid"
  // means for it. The legacy owner-driven flow (bookConsultation()) always
  // assigns date+time before a deposit is ever collected, so "confirmed" is
  // correct immediately. The client self-serve flow (continueToDeposit() in
  // app/portal/[studio]/projects/[id]/actions.ts) creates the booking with no
  // date/time — the owner still has to schedule it afterward — so it must land
  // in "awaiting_schedule" instead, exactly like the existing custom_requests
  // deposit flow (see supabase/migrations/20260623000005_process_custom_request_deposit_rpc.sql
  // and the analogous owner-side app/api/custom-requests/[id]/schedule/route.ts,
  // which performs the awaiting_schedule → confirmed transition once a real
  // date/time is assigned).
  const { data: bookingBefore } = await supabase
    .from("bookings")
    .select("date")
    .eq("id", dp.booking_id)
    .maybeSingle();

  const hasSchedule = Boolean((bookingBefore as { date: string | null } | null)?.date);
  const nextBookingStatus = hasSchedule ? "confirmed" : "awaiting_schedule";

  const { error: bookingUpdateError } = await supabase
    .from("bookings")
    .update({
      status:          nextBookingStatus,
      deposit_paid:    true,
      deposit_paid_at: now,
    } as never)
    .eq("id", dp.booking_id);

  if (bookingUpdateError) {
    console.error("[stripe/webhook] bookings update failed:", bookingUpdateError);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  // Advance the linked consultation (if any — most bookings, e.g. the classic
  // client-facing flow, have none) to Deposit Paid, but only if that's a
  // legitimate forward move. bookConsultation() now caps status at "quoted"
  // while a deposit is pending (never "booked" — see its own comment), so in
  // the normal case this is a plain quoted -> deposit_paid step. This guard
  // exists as defense-in-depth against any future/legacy path that still sets
  // "booked" before payment: without it, a retried/late webhook event could
  // regress an already-"booked" consultation back to "deposit_paid". A skip
  // here never affects the payment itself — deposit_payments/bookings above are
  // already updated by this point regardless of what happens next.
  const { data: linkedConsult } = await supabase
    .from("consultations")
    .select("id, status")
    .eq("booking_id" as never, dp.booking_id)
    .maybeSingle();
  const linked = linkedConsult as { id: string; status: string } | null;

  if (linked) {
    if (isForwardSystemTransition(linked.status, "deposit_paid")) {
      await supabase
        .from("consultations")
        .update({ status: "deposit_paid" } as never)
        .eq("id" as never, linked.id);
    } else {
      console.log(
        "[stripe/webhook] skipped consultation status update — current status",
        `"${linked.status}"`, "does not allow advancing to deposit_paid | consultation:", linked.id
      );
    }
  }

  const { data: bookingRow } = await supabase
    .from("bookings")
    .select("client_id, artist_id, studio_id, date, time, deposit_amount_cents")
    .eq("id", dp.booking_id)
    .single();

  // Only send the "your session is confirmed" notifications when there's a
  // real date/time to put in them — an awaiting_schedule booking has neither
  // yet, and the owner's later scheduling step (see above) is the point where
  // the client actually learns their appointment time.
  if (bookingRow && hasSchedule) {
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

  console.log("[stripe/webhook] deposit confirmed — booking:", dp.booking_id, "| dp:", dp.id);
  return NextResponse.json({ received: true });
}

// Remainder payment side effect — sets remainder_collected/remainder_collected_at
// on the booking and notifies the client. Deliberately does not touch
// bookings.status/deposit_paid — those belong to the deposit lifecycle only.
async function handleRemainderPayment(
  supabase: ReturnType<typeof createAdminClient>,
  bookingId: string,
  paidAt: string
): Promise<NextResponse> {
  const { error: bookingUpdateError } = await supabase
    .from("bookings")
    .update({ remainder_collected: true, remainder_collected_at: paidAt } as never)
    .eq("id", bookingId);

  if (bookingUpdateError) {
    console.error("[stripe/webhook] remainder bookings update failed:", bookingUpdateError.message);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  const { data: bookingRow } = await supabase
    .from("bookings")
    .select("client_id, studio_id, deposit_amount_cents, total_amount_cents, quote_amount_cents")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingRow) {
    const booking = bookingRow as {
      client_id: string; studio_id: string;
      deposit_amount_cents: number; total_amount_cents: number | null; quote_amount_cents: number | null;
    };

    const [{ data: clientData }, { data: studioData }] = await Promise.all([
      supabase.from("clients").select("full_name, email, phone").eq("id", booking.client_id).maybeSingle(),
      supabase.from("studios").select("name").eq("id", booking.studio_id).maybeSingle(),
    ]);

    const client = clientData as { full_name: string; email: string; phone: string } | null;
    const studioName = (studioData as { name: string } | null)?.name ?? "the studio";
    const balanceDueCents = getBalanceDueCents(booking) ?? 0;

    if (client?.phone) {
      void trySendSms(client.phone, buildSmsMessage("remainder_received", studioName));
    }
    if (client?.email) {
      void sendRemainderReceivedEmail({
        to: client.email,
        clientName: client.full_name,
        studioName,
        balanceDueCents,
      });
    }
  }

  console.log("[stripe/webhook] remainder collected — booking:", bookingId);
  return NextResponse.json({ received: true });
}

// ── Branch C: Legacy booking deposit (unchanged) ──────────────────────────────
async function handleLegacyBookingDeposit(
  session: { id: string; payment_intent: unknown; metadata: Record<string, string> | null },
  bookingId: string
): Promise<NextResponse> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // Idempotency guard — same pattern as handleDepositPayment (Branch A):
  // a Stripe webhook retry must not re-confirm an already-confirmed booking
  // and re-send the "booking confirmed" SMS/email a second time.
  const { data: existingBooking } = await supabase
    .from("bookings")
    .select("deposit_paid")
    .eq("id", bookingId)
    .maybeSingle();

  if ((existingBooking as { deposit_paid: boolean } | null)?.deposit_paid) {
    console.log("[stripe/webhook] Branch C: already processed — booking:", bookingId);
    return NextResponse.json({ received: true });
  }

  await Promise.all([
    supabase
      .from("bookings")
      .update({
        status:          "confirmed",
        deposit_paid:    true,
        deposit_paid_at: now,
      } as never)
      .eq("id", bookingId),
    supabase
      .from("deposits")
      .update({
        status:                   "paid",
        paid_at:                  now,
        stripe_payment_intent_id: session.payment_intent as string,
      } as never)
      .eq("booking_id", bookingId),
  ]);

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
        console.error("[stripe/webhook] legacy branch email failed:", err);
      }
    }
  }

  return NextResponse.json({ received: true });
}
