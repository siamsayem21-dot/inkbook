import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findOrCreateClient } from "@/lib/clients";

// Public, unauthenticated endpoint — same trust model as POST /api/bookings.
// Reached when a client hits an artist's monthly booking cap there and
// chooses to join the waitlist instead (Phase C Feature 6).
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { artistId, clientName, clientEmail, clientPhone, style, notes } = body;

  if (!artistId || !clientName || !clientEmail || !clientPhone) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: artistData } = await supabase
    .from("artists")
    .select("id, studio_id")
    .eq("id", artistId)
    .single();
  const artist = artistData as { id: string; studio_id: string } | null;
  if (!artist) return NextResponse.json({ error: "Artist not found" }, { status: 404 });

  const { clientId, error: clientError } = await findOrCreateClient(supabase, artist.studio_id, {
    name: clientName,
    email: clientEmail,
    phone: clientPhone,
  });
  if (clientError || !clientId) {
    return NextResponse.json({ error: clientError ?? "Failed to create client record" }, { status: 500 });
  }

  // Idempotent pre-check — the existing UNIQUE(artist_id, client_id)
  // constraint (waitlist table, initial schema) is the real guarantee;
  // this just avoids a needless error round-trip on the common case of a
  // client re-submitting the form.
  const { data: existingEntry } = await supabase
    .from("waitlist")
    .select("id")
    .eq("artist_id", artistId)
    .eq("client_id", clientId)
    .maybeSingle();

  if (existingEntry) {
    return NextResponse.json({ success: true, alreadyOnWaitlist: true });
  }

  const { error } = await supabase
    .from("waitlist")
    .insert({
      studio_id: artist.studio_id,
      artist_id: artistId,
      client_id: clientId,
      preferred_style: style || null,
      notes: notes || null,
    } as never);

  if (error) {
    // 23505 = unique_violation — a race the pre-check above missed.
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json({ success: true, alreadyOnWaitlist: true });
    }
    console.error("[api/waitlist]", error.message);
    return NextResponse.json({ error: "Failed to join waitlist — please try again" }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
