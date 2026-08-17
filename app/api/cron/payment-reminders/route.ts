import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSmsMessage, trySendSms } from "@/lib/twilio/client";
import { getBalanceDueCents } from "@/lib/booking-balance";
import { sendRemainderPaymentRequest } from "@/lib/remainder-payment";

export const runtime = "nodejs";

// Runs once daily at 13:00 UTC (see vercel.json) — downgraded from an
// original 4-hour cadence by 7d27e72 because Vercel's Hobby plan only
// allows daily cron jobs. That commit only changed vercel.json; the
// deposit-reminder window below was left sized for the old 4-hour cadence
// (5h lookahead) and was never widened to match, meaning most
// pending-deposit bookings fell outside the one daily 5-hour slot and
// silently never got a reminder before cron/cancel-expired auto-cancelled
// them. Fixed here: window widened to 25h (one day + 1h safety margin) so
// every booking is guaranteed to fall inside exactly one daily run's
// window, on the run immediately following its creation — matching the
// original "Option B: frequent cron + narrow window" intent, just
// re-tuned for the cadence Vercel actually allows.
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
  // Window (deposit_expires_at within the next 25 hours) matched to the
  // actual daily cron cadence, with a 1-hour safety margin in case a single
  // run is delayed or skipped — every pending_deposit booking's ~24h expiry
  // window is guaranteed to fall inside exactly one daily run's window (the
  // run immediately following the booking's creation), so it always gets
  // reminded well before it expires and gets auto-cancelled by
  // cron/cancel-expired. (Previously 5 hours, sized for a since-abandoned
  // 4-hour cadence — see comment above.)
  const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

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
