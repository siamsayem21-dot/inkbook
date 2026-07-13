import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSmsMessage, trySendSms } from "@/lib/twilio/client";
import { getBalanceDueCents } from "@/lib/booking-balance";
import { sendRemainderPaymentRequest } from "@/lib/remainder-payment";

export const runtime = "nodejs";

// Runs every 4 hours (see vercel.json) — a narrower cadence than the other
// daily crons, specifically so the deposit-reminder pass below can use a
// tight eligibility window without ever missing a booking's reminder moment
// (Phase C Feature 3, "Option B": frequent cron + narrow window).
//
// Both passes are deduped with a one-shot boolean flag on `bookings`
// (deposit_reminder_sent / remainder_reminder_sent — added in
// 20260716000000_payment_reminders.sql), exactly like the existing
// sms_48hr_sent/sms_day_of_sent pattern in cron/sms-reminders. Each flag is
// flipped true at most once per booking, so re-running this cron — however
// often — can never send the same reminder twice.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();

  // ── Pass 1: deposit-pending reminder ──────────────────────────────────────
  // Narrow window (deposit_expires_at within the next 5 hours) matched to the
  // 4-hour cron cadence, with a 1-hour safety margin in case a single run is
  // delayed or skipped — every pending_deposit booking's window will overlap
  // at least one run before it actually expires and gets auto-cancelled by
  // cron/cancel-expired.
  const windowEnd = new Date(now.getTime() + 5 * 60 * 60 * 1000);

  let depositRemindersSent = 0;

  const { data: depositRows, error: depositFetchError } = await supabase
    .from("bookings")
    .select("id, client_id, studio_id")
    .eq("status", "pending_deposit")
    .eq("deposit_reminder_sent" as never, false)
    .gte("deposit_expires_at", now.toISOString())
    .lte("deposit_expires_at", windowEnd.toISOString());

  if (depositFetchError) {
    console.error("[cron/payment-reminders] deposit fetch failed:", depositFetchError.message);
    return NextResponse.json({ error: depositFetchError.message }, { status: 500 });
  }

  for (const row of (depositRows ?? []) as { id: string; client_id: string; studio_id: string }[]) {
    const [{ data: clientData }, { data: studioData }] = await Promise.all([
      supabase.from("clients").select("phone").eq("id", row.client_id).maybeSingle(),
      supabase.from("studios").select("name").eq("id", row.studio_id).maybeSingle(),
    ]);
    const phone = (clientData as { phone: string } | null)?.phone;
    const studioName = (studioData as { name: string } | null)?.name;

    if (phone && studioName) {
      void trySendSms(phone, buildSmsMessage("deposit_pending", studioName));
    }
    // Marked sent regardless of delivery outcome — trySendSms swallows its
    // own errors (same convention as cron/sms-reminders), so there is no
    // success signal to gate on here.
    await supabase
      .from("bookings")
      .update({ deposit_reminder_sent: true } as never)
      .eq("id", row.id);
    depositRemindersSent++;
  }

  // ── Pass 2: outstanding remainder-balance reminder ────────────────────────
  // Not deadline-driven (no expiry to race against), so a session having
  // already passed is a stable, simple trigger — checked every run, but only
  // ever sent once per booking via the dedupe flag.
  const today = now.toISOString().split("T")[0];

  let remainderRemindersSent = 0;

  const { data: remainderRows, error: remainderFetchError } = await supabase
    .from("bookings")
    .select("id, artist_id, client_id, studio_id, deposit_amount_cents, total_amount_cents, quote_amount_cents")
    .in("status", ["confirmed", "completed"])
    .eq("remainder_collected" as never, false)
    .eq("remainder_reminder_sent" as never, false)
    .not("date", "is", null)
    .lt("date", today);

  if (remainderFetchError) {
    console.error("[cron/payment-reminders] remainder fetch failed:", remainderFetchError.message);
    return NextResponse.json({ error: remainderFetchError.message }, { status: 500 });
  }

  for (const row of (remainderRows ?? []) as {
    id: string; artist_id: string; client_id: string; studio_id: string;
    deposit_amount_cents: number; total_amount_cents: number | null; quote_amount_cents: number | null;
  }[]) {
    const balanceDueCents = getBalanceDueCents(row);
    // No agreed total price (classic self-serve booking) or nothing owed —
    // nothing to remind about, and nothing to ever mark sent for either,
    // since it may become eligible later if the total price changes.
    if (balanceDueCents === null || balanceDueCents <= 0) continue;

    const [{ data: artistData }, { data: clientData }, { data: studioData }] = await Promise.all([
      supabase.from("artists").select("name").eq("id", row.artist_id).maybeSingle(),
      supabase.from("clients").select("full_name, email, phone").eq("id", row.client_id).maybeSingle(),
      supabase.from("studios").select("name").eq("id", row.studio_id).maybeSingle(),
    ]);

    const artistName = (artistData as { name: string } | null)?.name ?? "your artist";
    const client = clientData as { full_name: string; email: string; phone: string } | null;
    const studioName = (studioData as { name: string } | null)?.name ?? "the studio";

    const result = await sendRemainderPaymentRequest({
      bookingId: row.id,
      artistId: row.artist_id,
      artistName,
      studioName,
      balanceDueCents,
      clientEmail: client?.email,
      clientName: client?.full_name,
      clientPhone: client?.phone,
    });

    if (result.error) {
      // Left unmarked so a transient failure (e.g. Stripe hiccup) is retried
      // on the next run instead of silently skipped forever.
      console.error("[cron/payment-reminders] remainder reminder failed for booking", row.id, ":", result.error);
      continue;
    }

    await supabase
      .from("bookings")
      .update({ remainder_reminder_sent: true } as never)
      .eq("id", row.id);
    remainderRemindersSent++;
  }

  return NextResponse.json({ depositRemindersSent, remainderRemindersSent });
}
