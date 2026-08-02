import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSmsMessage, trySendSms } from "@/lib/twilio/client";
import { sendAppointmentReminderEmail } from "@/lib/email";

export const runtime = "nodejs";

type CandidateBookingRow = {
  id: string;
  client_id: string;
  artist_id: string;
  studio_id: string;
  date: string;
  time: string;
  sms_48hr_sent: boolean;
  email_48hr_sent: boolean;
  sms_day_of_sent: boolean;
  email_day_of_sent: boolean;
};

type ClientRow = { full_name: string; email: string; phone: string };
type ArtistRow = { name: string };
type StudioRow = { name: string; address: string | null; timezone: string };

// Studio-local calendar date (YYYY-MM-DD) for `when` — "today" and "48
// hours out" must be judged against each studio's own timezone, not the
// server's (UTC) clock, or a studio far enough from UTC gets its day-of
// reminder on the wrong calendar day. en-CA formats as YYYY-MM-DD directly.
function localDateString(when: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(when);
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();

  // Over-fetch a window wide enough to contain every studio's local
  // "today" and "48 hours out" regardless of timezone offset (a day of
  // slack on each side comfortably covers every real-world UTC offset).
  // Each candidate's exact target date is then decided per-row below,
  // once we know that booking's studio's timezone.
  const rangeStart = new Date(now);
  rangeStart.setUTCDate(rangeStart.getUTCDate() - 1);
  const rangeEnd = new Date(now);
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 3);

  // Business rule: reminders only go out for bookings with a paid deposit.
  // status = 'confirmed' already implies deposit_paid = true in every code
  // path that sets it (Stripe/billing webhooks, consent-forms route), but
  // it's checked explicitly here so the rule holds in code, not just by
  // convention.
  const { data: candidates } = await supabase
    .from("bookings")
    .select(
      "id, client_id, artist_id, studio_id, date, time, sms_48hr_sent, email_48hr_sent, sms_day_of_sent, email_day_of_sent" as never
    )
    .eq("status", "confirmed")
    .eq("deposit_paid", true)
    .not("date", "is", null)
    .gte("date", rangeStart.toISOString().split("T")[0])
    .lte("date", rangeEnd.toISOString().split("T")[0])
    .or("sms_48hr_sent.eq.false,email_48hr_sent.eq.false,sms_day_of_sent.eq.false,email_day_of_sent.eq.false");

  let sent48hr = 0;
  let sentDayOf = 0;

  for (const row of (candidates ?? []) as CandidateBookingRow[]) {
    const { data: studioData } = await supabase
      .from("studios")
      .select("name, address, timezone" as never)
      .eq("id", row.studio_id)
      .maybeSingle();
    const studio = studioData as StudioRow | null;
    if (!studio) continue;

    const todayLocal = localDateString(now, studio.timezone);
    const twoDaysOutLocal = localDateString(new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), studio.timezone);

    const reminderType: "48hr" | "day_of" | null =
      row.date === twoDaysOutLocal ? "48hr" : row.date === todayLocal ? "day_of" : null;
    // Outside this studio's local target window for today's run — still
    // eligible on a future run, so it's simply skipped, not marked.
    if (!reminderType) continue;

    const smsAlreadySent = reminderType === "48hr" ? row.sms_48hr_sent : row.sms_day_of_sent;
    const emailAlreadySent = reminderType === "48hr" ? row.email_48hr_sent : row.email_day_of_sent;
    if (smsAlreadySent && emailAlreadySent) continue;

    const smsFlag = reminderType === "48hr" ? "sms_48hr_sent" : "sms_day_of_sent";
    const emailFlag = reminderType === "48hr" ? "email_48hr_sent" : "email_day_of_sent";
    const smsMessageType = reminderType === "48hr" ? "48hr_reminder" : "day_of_reminder";

    const [{ data: clientData }, { data: artistData }] = await Promise.all([
      supabase.from("clients").select("full_name, email, phone").eq("id", row.client_id).maybeSingle(),
      supabase.from("artists").select("name").eq("id", row.artist_id).maybeSingle(),
    ]);
    const client = clientData as ClientRow | null;
    const artistName = (artistData as ArtistRow | null)?.name ?? "your artist";

    if (!client) continue;

    // Blacklist check — same is_client_blacklisted() RPC used at
    // booking/deposit time (see app/portal/[studio]/projects/[id]/actions.ts).
    // Skipped and left unmarked, same as "missing contact info" below, so a
    // client removed from the blacklist later still gets reminded.
    const { data: isBlacklisted } = await supabase.rpc("is_client_blacklisted" as never, {
      p_studio_id: row.studio_id,
      p_email: client.email,
      p_phone: client.phone,
    } as never);
    if (isBlacklisted) continue;

    let notified = false;

    if (client.phone && !smsAlreadySent) {
      await trySendSms(client.phone, buildSmsMessage(smsMessageType, studio.name));
      await supabase.from("bookings").update({ [smsFlag]: true } as never).eq("id", row.id);
      notified = true;
    }

    if (client.email && !emailAlreadySent) {
      try {
        const delivered = await sendAppointmentReminderEmail({
          to: client.email,
          clientName: client.full_name,
          artistName,
          studioName: studio.name,
          studioAddress: studio.address,
          date: row.date,
          time: row.time,
          reminderType,
        });
        if (delivered) {
          await supabase.from("bookings").update({ [emailFlag]: true } as never).eq("id", row.id);
          notified = true;
        }
      } catch (err) {
        // One booking's email failure shouldn't stop the rest of the batch
        // from getting their reminders — log and move on, unmarked, so this
        // booking is retried on the next cron run.
        console.error(`[sms-reminders] email send failed for booking ${row.id}:`, err instanceof Error ? err.message : err);
      }
    }

    if (notified) {
      if (reminderType === "48hr") sent48hr++;
      else sentDayOf++;
    }
  }

  return NextResponse.json({ sent48hr, sentDayOf });
}
