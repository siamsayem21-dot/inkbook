import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSmsMessage, trySendSms } from "@/lib/twilio/client";

export const runtime = "nodejs";

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

  let sent48hr = 0;
  let sentDayOf = 0;

  // 48-hour reminders
  const { data: reminders48hr } = await supabase
    .from("bookings")
    .select("id, client_id, studio_id")
    .eq("status", "confirmed")
    .eq("sms_48hr_sent" as never, false)
    .eq("date", twoDaysOutStr);

  for (const row of (reminders48hr ?? []) as { id: string; client_id: string; studio_id: string }[]) {
    const [{ data: clientData }, { data: studioData }] = await Promise.all([
      supabase.from("clients").select("phone").eq("id", row.client_id).single(),
      supabase.from("studios").select("name").eq("id", row.studio_id).single(),
    ]);
    const phone = (clientData as { phone: string } | null)?.phone;
    const studioName = (studioData as { name: string } | null)?.name;

    if (phone && studioName) {
      await trySendSms(phone, buildSmsMessage("48hr_reminder", studioName));
      await supabase
        .from("bookings")
        .update({ sms_48hr_sent: true } as never)
        .eq("id", row.id);
      sent48hr++;
    }
  }

  // Day-of reminders
  const { data: dayOfBookings } = await supabase
    .from("bookings")
    .select("id, client_id, studio_id")
    .eq("status", "confirmed")
    .eq("sms_day_of_sent" as never, false)
    .eq("date", today);

  for (const row of (dayOfBookings ?? []) as { id: string; client_id: string; studio_id: string }[]) {
    const [{ data: clientData }, { data: studioData }] = await Promise.all([
      supabase.from("clients").select("phone").eq("id", row.client_id).single(),
      supabase.from("studios").select("name").eq("id", row.studio_id).single(),
    ]);
    const phone = (clientData as { phone: string } | null)?.phone;
    const studioName = (studioData as { name: string } | null)?.name;

    if (phone && studioName) {
      await trySendSms(phone, buildSmsMessage("day_of_reminder", studioName));
      await supabase
        .from("bookings")
        .update({ sms_day_of_sent: true } as never)
        .eq("id", row.id);
      sentDayOf++;
    }
  }

  return NextResponse.json({ sent48hr, sentDayOf });
}
