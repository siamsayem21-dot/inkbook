import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/config";
import { trySendSms } from "@/lib/twilio/client";
import { sendSessionScheduledEmail } from "@/lib/email";
import { isAtMonthlyCap } from "@/lib/waitlist";
import { isWithinConflictBuffer } from "@/lib/booking-conflict";

// PATCH /api/custom-requests/[id]/schedule
// Body: { date: "YYYY-MM-DD", time: "HH:MM", artist_id?: string }
// Sets the date/time on the linked booking, moves it from awaiting_schedule → confirmed,
// and moves the custom request from accepted → scheduled.
// Only the studio owner can call this endpoint.
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { date, time, artist_id: bodyArtistId } = body as {
    date?: string;
    time?: string;
    artist_id?: string;
  };

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date is required (YYYY-MM-DD)" }, { status: 400 });
  }
  if (!time || !/^\d{2}:\d{2}$/.test(time)) {
    return NextResponse.json({ error: "time is required (HH:MM)" }, { status: 400 });
  }
  // Reject past dates
  if (date < new Date().toISOString().split("T")[0]) {
    return NextResponse.json({ error: "date cannot be in the past" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Owner-only: fetch every studio this user owns — not .maybeSingle(),
  // which errors (returned as null, silently, since the destructure
  // discards it) whenever an owner has more than one studio row, incorrectly
  // 403ing every real multi-studio owner. Membership is confirmed below,
  // once we know which studio the request actually belongs to.
  const { data: ownedStudiosRaw } = await supabase
    .from("studios")
    .select("id, name, subdomain, owner_id")
    .eq("owner_id", user.id);

  const ownedStudios = (ownedStudiosRaw ?? []) as {
    id: string;
    name: string;
    subdomain: string;
    owner_id: string;
  }[];

  if (ownedStudios.length === 0) {
    return NextResponse.json({ error: "Forbidden — studio owners only" }, { status: 403 });
  }

  // Fetch the custom request and verify it belongs to one of this owner's studios
  const { data: crRaw } = await supabase
    .from("custom_requests")
    .select("id, studio_id, artist_id, booking_id, client_name, client_email, client_phone, status, deposit_amount, quote_amount")
    .eq("id", params.id)
    .single();

  if (!crRaw) return NextResponse.json({ error: "Custom request not found" }, { status: 404 });

  const cr = crRaw as {
    id: string;
    studio_id: string;
    artist_id: string | null;
    booking_id: string | null;
    client_name: string;
    client_email: string;
    client_phone: string | null;
    status: string;
    deposit_amount: number | null;
    quote_amount: number | null;
  };

  const studio = ownedStudios.find((s) => s.id === cr.studio_id) ?? null;

  if (!studio) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (cr.status !== "accepted") {
    return NextResponse.json(
      { error: `Request must be in 'accepted' state to schedule (currently '${cr.status}')` },
      { status: 409 }
    );
  }

  if (!cr.booking_id) {
    return NextResponse.json({ error: "No linked booking — deposit must be paid first" }, { status: 409 });
  }

  // Verify the booking is still awaiting schedule
  const { data: bookingRaw } = await supabase
    .from("bookings")
    .select("id, status, artist_id")
    .eq("id", cr.booking_id)
    .single();

  if (!bookingRaw) return NextResponse.json({ error: "Linked booking not found" }, { status: 404 });

  const booking = bookingRaw as { id: string; status: string; artist_id: string | null };

  if (booking.status !== "awaiting_schedule") {
    return NextResponse.json(
      { error: `Booking is already in '${booking.status}' state` },
      { status: 409 }
    );
  }

  // Resolve artist — can be overridden by the owner in the body
  let resolvedArtistId = cr.artist_id ?? booking.artist_id;

  if (bodyArtistId) {
    const { data: targetArtist } = await supabase
      .from("artists")
      .select("id")
      .eq("id", bodyArtistId)
      .eq("studio_id", studio.id)
      .maybeSingle();

    if (!targetArtist) {
      return NextResponse.json({ error: "artist_id does not belong to this studio" }, { status: 400 });
    }
    resolvedArtistId = bodyArtistId;
  }

  if (!resolvedArtistId) {
    return NextResponse.json({ error: "No artist assigned — assign an artist before scheduling" }, { status: 400 });
  }

  // Conflict check: artist must not have another confirmed booking within
  // the buffer window of this date+time — see lib/booking-conflict.ts.
  const { data: sameDayBookings } = await supabase
    .from("bookings")
    .select("id, time")
    .eq("artist_id", resolvedArtistId)
    .eq("date", date)
    .in("status", ["confirmed", "awaiting_schedule"])
    .neq("id", cr.booking_id);

  const hasConflict = (sameDayBookings ?? []).some((row) =>
    isWithinConflictBuffer((row as { time: string }).time, time)
  );

  if (hasConflict) {
    return NextResponse.json(
      { error: "Artist already has a booking at that date and time" },
      { status: 409 }
    );
  }

  // Monthly booking cap (Phase C Feature 6) — same check as assignSchedule()
  // in app/(owner)/owner/bookings/[bookingId]/actions.ts, checked against the
  // month of the date being assigned.
  const { data: artistCapRow } = await supabase
    .from("artists")
    .select("name, monthly_booking_cap")
    .eq("id", resolvedArtistId)
    .maybeSingle();
  const artistForCap = artistCapRow as { name: string; monthly_booking_cap: number } | null;
  if (artistForCap && (await isAtMonthlyCap(supabase, resolvedArtistId, artistForCap.monthly_booking_cap, date))) {
    return NextResponse.json(
      { error: `${artistForCap.name} is already at capacity for that month — choose a different date.` },
      { status: 409 }
    );
  }

  // Atomic update: booking confirmed + custom request scheduled
  const [{ error: bookingError }, { error: crError }] = await Promise.all([
    supabase
      .from("bookings")
      .update({
        date,
        time,
        status:     "confirmed",
        artist_id:  resolvedArtistId,
      } as never)
      .eq("id", cr.booking_id)
      .eq("status", "awaiting_schedule"), // optimistic lock — prevents double-schedule race
    supabase
      .from("custom_requests")
      .update({ status: "scheduled" } as never)
      .eq("id", params.id)
      .eq("status", "accepted"),
  ]);

  if (bookingError || crError) {
    console.error("[schedule] update error — booking:", bookingError?.message, "| cr:", crError?.message);
    return NextResponse.json({ error: "Failed to schedule session" }, { status: 500 });
  }

  // Notifications
  const { data: artistRow } = await supabase
    .from("artists")
    .select("name")
    .eq("id", resolvedArtistId)
    .single();

  const artistName = (artistRow as { name: string } | null)?.name ?? "your artist";

  const formattedDate = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  const depositCents = Math.round((cr.deposit_amount ?? 0) * 100);
  const totalCents   = Math.round((cr.quote_amount   ?? 0) * 100);

  const { data: studioAddrRow } = await supabase
    .from("studios")
    .select("address")
    .eq("id", studio.id)
    .single();

  const studioAddress = (studioAddrRow as { address: string | null } | null)?.address ?? null;

  if (cr.client_phone) {
    void trySendSms(
      cr.client_phone,
      `Your session with ${artistName} at ${studio.name} is confirmed for ${formattedDate} at ${time}. See you there!`
    );
  }

  void sendSessionScheduledEmail({
    to:                 cr.client_email,
    clientName:         cr.client_name,
    artistName,
    studioName:         studio.name,
    studioAddress,
    date:               formattedDate,
    time,
    depositAmountCents: depositCents,
    totalAmountCents:   totalCents,
  });

  return NextResponse.json({ success: true, booking_id: cr.booking_id });
}
