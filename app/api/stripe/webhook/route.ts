import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSmsMessage, trySendSms } from "@/lib/twilio/client";
import {
  sendBookingConfirmationEmail,
  sendCustomRequestAcceptedEmail,
  sendOwnerDepositNotificationEmail,
} from "@/lib/email";

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
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  await supabase
    .from("consultations")
    .update({ status: "deposit_paid" } as never)
    .eq("booking_id" as never, dp.booking_id);

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
        console.error("[stripe/webhook] email send failed:", err);
      }
    }
  }

  console.log("[stripe/webhook] deposit confirmed — booking:", dp.booking_id, "| dp:", dp.id);
  return NextResponse.json({ received: true });
}

// ── Branch C: Legacy booking deposit (unchanged) ──────────────────────────────
async function handleLegacyBookingDeposit(
  session: { id: string; payment_intent: unknown; metadata: Record<string, string> | null },
  bookingId: string
): Promise<NextResponse> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

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
