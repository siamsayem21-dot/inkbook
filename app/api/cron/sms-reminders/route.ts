import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSmsMessage, trySendSms } from "@/lib/twilio/client";
import { sendAppointmentReminderEmail } from "@/lib/email";

export const runtime = "nodejs";

type ReminderBookingRow = {
  id: string;
  client_id: string;
  artist_id: string;
  studio_id: string;
  date: string;
  time: string;
  sms_sent: boolean;
  email_sent: boolean;
};

type ClientRow = { full_name: string; email: string; phone: string };
type ArtistRow = { name: string };
type StudioRow = { name: string; address: string | null };

// Shared by both the 48hr and day-of passes below. SMS and email are
// dispatched and deduped independently (sms_48hr_sent/email_48hr_sent,
// sms_day_of_sent/email_day_of_sent) so a missing phone or email — or a
// failure on one channel — never blocks the other. Blacklisted clients
// (is_client_blacklisted RPC, same one used at booking/deposit time — see
// app/portal/[studio]/projects/[id]/actions.ts) are skipped on both
// channels and left unmarked, matching the existing "missing contact info"
// behavior of just re-checking on the next run.
async function sendReminderPass(
  supabase: ReturnType<typeof createAdminClient>,
  rows: ReminderBookingRow[],
  reminderType: "48hr" | "day_of"
): Promise<number> {
  const smsFlag = reminderType === "48hr" ? "sms_48hr_sent" : "sms_day_of_sent";
  const emailFlag = reminderType === "48hr" ? "email_48hr_sent" : "email_day_of_sent";
  const smsMessageType = reminderType === "48hr" ? "48hr_reminder" : "day_of_reminder";

  let sent = 0;

  for (const row of rows) {
    const [{ data: clientData }, { data: artistData }, { data: studioData }] = await Promise.all([
      supabase.from("clients").select("full_name, email, phone").eq("id", row.client_id).maybeSingle(),
      supabase.from("artists").select("name").eq("id", row.artist_id).maybeSingle(),
      supabase.from("studios").select("name, address").eq("id", row.studio_id).maybeSingle(),
    ]);
    const client = clientData as ClientRow | null;
    const artistName = (artistData as ArtistRow | null)?.name ?? "your artist";
    const studio = studioData as StudioRow | null;

    if (!client || !studio) continue;

    const { data: isBlacklisted } = await supabase.rpc("is_client_blacklisted" as never, {
      p_studio_id: row.studio_id,
      p_email: client.email,
      p_phone: client.phone,
    } as never);
    if (isBlacklisted) continue;

    let notified = false;

    if (client.phone && !row.sms_sent) {
      await trySendSms(client.phone, buildSmsMessage(smsMessageType, studio.name));
      await supabase.from("bookings").update({ [smsFlag]: true } as never).eq("id", row.id);
      notified = true;
    }

    if (client.email && !row.email_sent) {
      await sendAppointmentReminderEmail({
        to: client.email,
        clientName: client.full_name,
        artistName,
        studioName: studio.name,
        studioAddress: studio.address,
        date: row.date,
        time: row.time,
        reminderType,
      });
      await supabase.from("bookings").update({ [emailFlag]: true } as never).eq("id", row.id);
      notified = true;
    }

    if (notified) sent++;
  }

  return sent;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const today = new Date().toISOString().split("T")[0];
  const twoDaysOut = new Date();
  twoDaysOut.setDate(twoDaysOut.getDate() + 2);
  const twoDaysOutStr = twoDaysOut.toISOString().split("T")[0];

  // 48-hour reminders.
  // .not("date", "is", null) excludes awaiting_schedule bookings — those have
  // a null date and must never be matched by date comparisons.
  const { data: reminders48hr } = await supabase
    .from("bookings")
    .select("id, client_id, artist_id, studio_id, date, time, sms_sent:sms_48hr_sent, email_sent:email_48hr_sent" as never)
    .eq("status", "confirmed")
    .not("date", "is", null)
    .eq("date", twoDaysOutStr)
    .or("sms_48hr_sent.eq.false,email_48hr_sent.eq.false");

  const sent48hr = await sendReminderPass(supabase, (reminders48hr ?? []) as ReminderBookingRow[], "48hr");

  // Day-of reminders.
  // Same null-date guard — awaiting_schedule bookings have no date.
  const { data: dayOfBookings } = await supabase
    .from("bookings")
    .select("id, client_id, artist_id, studio_id, date, time, sms_sent:sms_day_of_sent, email_sent:email_day_of_sent" as never)
    .eq("status", "confirmed")
    .not("date", "is", null)
    .eq("date", today)
    .or("sms_day_of_sent.eq.false,email_day_of_sent.eq.false");

  const sentDayOf = await sendReminderPass(supabase, (dayOfBookings ?? []) as ReminderBookingRow[], "day_of");

  return NextResponse.json({ sent48hr, sentDayOf });
}
