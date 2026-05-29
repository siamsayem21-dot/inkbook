import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { trySendSms } from "@/lib/twilio/client";

// Personalized reminder sender — called by Vercel cron (vercel.json).
// Uses client name, artist name, studio name in each message.
// Deduplicates via sms_48hr_sent / sms_day_of_sent columns on bookings.

type BookingRow = {
  id: string;
  time: string;
  client_id: string;
  artist_id: string;
  studio_id: string;
};

type ClientRow = { full_name: string; phone: string };
type NameRow = { name: string };

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const [{ data: raw48hr }, { data: rawDayOf }] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, time, client_id, artist_id, studio_id")
      .eq("status", "confirmed")
      .eq("sms_48hr_sent" as never, false)
      .eq("date", tomorrowStr),
    supabase
      .from("bookings")
      .select("id, time, client_id, artist_id, studio_id")
      .eq("status", "confirmed")
      .eq("sms_day_of_sent" as never, false)
      .eq("date", today),
  ]);

  async function sendAndMark(
    bookings: BookingRow[],
    type: "48hr" | "day_of"
  ): Promise<number> {
    let count = 0;
    for (const b of bookings) {
      const [{ data: clientData }, { data: artistData }, { data: studioData }] =
        await Promise.all([
          supabase.from("clients").select("full_name, phone").eq("id", b.client_id).single(),
          supabase.from("artists").select("name").eq("id", b.artist_id).single(),
          supabase.from("studios").select("name").eq("id", b.studio_id).single(),
        ]);

      const client = clientData as ClientRow | null;
      const artist = artistData as NameRow | null;
      const studio = studioData as NameRow | null;

      if (!client?.phone) continue;

      const clientName = client.full_name;
      const artistName = artist?.name ?? "your artist";
      const studioName = studio?.name ?? "the studio";
      const time = b.time.slice(0, 5);

      const message =
        type === "48hr"
          ? `Hi ${clientName}! Reminder: your tattoo appointment is tomorrow at ${time} with ${artistName} at ${studioName}. Reply STOP to opt out.`
          : `Hi ${clientName}! See you today at ${time} with ${artistName}. Need to reschedule? Call us. Reply STOP to opt out.`;

      await trySendSms(client.phone, message);

      await supabase
        .from("bookings")
        .update(
          (type === "48hr"
            ? { sms_48hr_sent: true }
            : { sms_day_of_sent: true }) as never
        )
        .eq("id", b.id);

      count++;
    }
    return count;
  }

  const [sent48hr, sentDayOf] = await Promise.all([
    sendAndMark((raw48hr ?? []) as BookingRow[], "48hr"),
    sendAndMark((rawDayOf ?? []) as BookingRow[], "day_of"),
  ]);

  return NextResponse.json({ sent48hr, sentDayOf });
}
