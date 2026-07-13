import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { buildSmsMessage, trySendSms } from "@/lib/twilio/client";
import { findOrCreateClient } from "@/lib/clients";
import { isAtMonthlyCap } from "@/lib/waitlist";

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
    .select("id, name, studio_id, monthly_booking_cap")
    .eq("id", artistId)
    .single();
  const artist = artistData as { id: string; name: string; studio_id: string; monthly_booking_cap: number } | null;
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

  // Slot collision — reject if artist already has a non-cancelled booking at this date/time
  const { data: slotTaken } = await supabase
    .from("bookings")
    .select("id")
    .eq("artist_id", artistId)
    .eq("date", date)
    .eq("time", time)
    .neq("status", "cancelled")
    .maybeSingle();

  if (slotTaken) {
    return NextResponse.json(
      { error: "This time slot is no longer available. Please choose a different time." },
      { status: 409 }
    );
  }

  // Monthly booking cap (Phase C Feature 6) — checked against the month of
  // the REQUESTED date, not "this month" (see lib/waitlist.ts for why the
  // existing artist_bookings_this_month() RPC doesn't fit this check).
  // Rejecting here, before any client record is created, keeps the reject
  // path clean — the client can still join the waitlist via a separate
  // POST /api/waitlist call, which creates its own client record.
  if (await isAtMonthlyCap(supabase, artistId, artist.monthly_booking_cap, date)) {
    return NextResponse.json(
      {
        error: `${artist.name} is fully booked for that month. Join the waitlist to be notified when a slot opens.`,
        waitlistEligible: true,
      },
      { status: 409 }
    );
  }

  // Find or create client
  const { clientId, error: clientError } = await findOrCreateClient(supabase, studio.id, {
    name: clientName,
    email: clientEmail,
    phone: clientPhone,
  });
  if (clientError || !clientId) {
    return NextResponse.json({ error: clientError ?? "Failed to create client record" }, { status: 500 });
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
