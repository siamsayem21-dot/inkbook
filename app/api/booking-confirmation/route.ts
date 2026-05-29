import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { trySendSms } from "@/lib/twilio/client";

// Sends an instant booking confirmation SMS.
// Call this right after a booking deposit is confirmed if you need
// to trigger it outside the Stripe webhook flow.

type BookingRow = {
  date: string;
  time: string;
  client_id: string;
  artist_id: string;
  studio_id: string;
  status: string;
};

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { bookingId } = body as { bookingId?: string };

  if (!bookingId) {
    return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: bookingData } = await supabase
    .from("bookings")
    .select("date, time, client_id, artist_id, studio_id, status")
    .eq("id", bookingId)
    .single();

  const booking = bookingData as BookingRow | null;
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const [{ data: clientData }, { data: artistData }, { data: studioData }] =
    await Promise.all([
      supabase.from("clients").select("full_name, phone").eq("id", booking.client_id).single(),
      supabase.from("artists").select("name").eq("id", booking.artist_id).single(),
      supabase.from("studios").select("name").eq("id", booking.studio_id).single(),
    ]);

  const client = clientData as { full_name: string; phone: string } | null;
  const artist = artistData as { name: string } | null;
  const studio = studioData as { name: string } | null;

  if (!client?.phone) {
    return NextResponse.json({ error: "No phone number on file for this client" }, { status: 422 });
  }

  const clientName = client.full_name;
  const artistName = artist?.name ?? "your artist";
  const studioName = studio?.name ?? "the studio";
  const time = booking.time.slice(0, 5);
  const date = new Date(booking.date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const message = `Hi ${clientName}! Your tattoo appointment with ${artistName} at ${studioName} is confirmed for ${date} at ${time}. Reply STOP to opt out.`;

  await trySendSms(client.phone, message);

  return NextResponse.json({ sent: true, to: client.phone });
}
