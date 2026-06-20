import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { buildSmsMessage, trySendSms } from "@/lib/twilio/client";

export async function GET(request: NextRequest) {
  // Bookings contain client PII. Require a valid session.
  const serverClient = createClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const studioId = searchParams.get("studioId");
  const artistId = searchParams.get("artistId");
  const supabase = createAdminClient();

  let query = supabase.from("bookings").select("*");
  if (studioId) query = query.eq("studio_id", studioId);
  if (artistId) query = query.eq("artist_id", artistId);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bookings: data ?? [] });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { artistId, clientName, clientEmail, clientPhone, date, time, style, description } = body;

  if (!artistId || !clientName || !clientEmail || !clientPhone || !date || !time || !style) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Fetch artist → studio
  const { data: artistData } = await supabase
    .from("artists")
    .select("id, name, studio_id")
    .eq("id", artistId)
    .single();
  const artist = artistData as { id: string; name: string; studio_id: string } | null;
  if (!artist) return NextResponse.json({ error: "Artist not found" }, { status: 404 });

  const { data: studioData } = await supabase
    .from("studios")
    .select("id, name, deposit_amount_cents")
    .eq("id", artist.studio_id)
    .single();
  const studio = studioData as { id: string; name: string; deposit_amount_cents: number } | null;
  if (!studio) return NextResponse.json({ error: "Studio not found" }, { status: 404 });

  // Check blacklist — match on email OR phone within this studio
  const [{ data: blockedByEmail }, { data: blockedByPhone }] = await Promise.all([
    supabase
      .from("blacklist")
      .select("id")
      .eq("studio_id", studio.id)
      .eq("client_email", String(clientEmail))
      .limit(1)
      .maybeSingle(),
    supabase
      .from("blacklist")
      .select("id")
      .eq("studio_id", studio.id)
      .eq("client_phone", String(clientPhone))
      .limit(1)
      .maybeSingle(),
  ]);
  if (blockedByEmail !== null || blockedByPhone !== null) {
    return NextResponse.json(
      { error: "Booking cannot be completed. Please contact the studio directly." },
      { status: 403 }
    );
  }

  // Find or create client
  const { data: existingClient } = await supabase
    .from("clients")
    .select("id")
    .eq("studio_id" as never, studio.id)
    .eq("email", clientEmail)
    .maybeSingle();

  let clientId: string;

  if (existingClient) {
    clientId = (existingClient as { id: string }).id;
  } else {
    const { data: newClient, error: clientErr } = await supabase
      .from("clients")
      .insert({
        studio_id: studio.id,
        full_name: clientName,
        email: clientEmail,
        phone: clientPhone,
      } as never)
      .select("id")
      .single();

    if (clientErr || !newClient) {
      return NextResponse.json({ error: "Failed to create client record" }, { status: 500 });
    }
    clientId = (newClient as { id: string }).id;
  }

  // Create booking
  const { data: bookingData, error: bookingErr } = await supabase
    .from("bookings")
    .insert({
      studio_id: studio.id,
      artist_id: artistId,
      client_id: clientId,
      date,
      time,
      style,
      description: description || null,
      status: "pending_deposit",
      deposit_amount_cents: studio.deposit_amount_cents,
      deposit_paid: false,
    } as never)
    .select("id, deposit_amount_cents")
    .single();

  if (bookingErr || !bookingData) {
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }

  const booking = bookingData as { id: string; deposit_amount_cents: number };

  // Send deposit reminder SMS (non-blocking — booking succeeds even if SMS fails)
  void trySendSms(clientPhone, buildSmsMessage("deposit_pending", studio.name));

  return NextResponse.json(
    {
      bookingId: booking.id,
      depositAmountCents: booking.deposit_amount_cents,
      studioName: studio.name,
      artistName: artist.name,
    },
    { status: 201 }
  );
}
