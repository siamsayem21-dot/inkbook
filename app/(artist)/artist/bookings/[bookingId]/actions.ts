"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/config";
import { markCompleted } from "@/app/(owner)/owner/bookings/[bookingId]/actions";

// Thin artist-scoped wrapper around the existing owner markCompleted()
// (app/(owner)/owner/bookings/[bookingId]/actions.ts) — reused unchanged so
// every terminal-state/consent/status guard already enforced there (confirmed
// -> completed only, consent required) stays identical for the Artist
// Portal. The only thing added here is the artist-identity check that
// action doesn't have: an artist may only act on a booking that's actually
// assigned to them (booking.artist_id === caller), never another artist's
// booking at the same studio — matching the pattern already established for
// saveArtistConsultationQuote().
//
// Cancellation is deliberately NOT exposed to artists (product decision,
// 2026-08-16): cancelArtistBooking() below always denies, regardless of
// which booking or which artist calls it — cancelling stays an
// Owner-Portal-only action (app/(owner)/owner/bookings/[bookingId]/actions.ts's
// own cancelBooking(), untouched). sendDepositRequest(), requestRemainderPayment()
// (Stripe/financial) and assignSchedule() (owner-orchestrated initial
// scheduling) are also deliberately NOT wrapped here — see TASKS.md's
// Artist Bookings 1/7 finding for why.

async function getCallerArtistAndBooking(bookingId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" as const };

  const supabase = createAdminClient();

  const { data: artistRaw } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  const artist = artistRaw as { id: string } | null;
  if (!artist) return { error: "Unauthorized" as const };

  const { data: bookingRaw } = await supabase
    .from("bookings")
    .select("id, artist_id")
    .eq("id", bookingId)
    .maybeSingle();
  const booking = bookingRaw as { id: string; artist_id: string } | null;
  if (!booking) return { error: "Booking not found." as const };
  if (booking.artist_id !== artist.id) return { error: "Booking not found." as const };

  return { artist, booking };
}

export async function markArtistBookingCompleted(bookingId: string): Promise<{ error?: string }> {
  const result = await getCallerArtistAndBooking(bookingId);
  if ("error" in result) return { error: result.error };

  return markCompleted(bookingId);
}

// Product rule: artists cannot cancel bookings from the Artist Portal, full
// stop — this denies unconditionally before any lookup or mutation, for any
// booking and any caller. Cancelling remains available only through Owner
// Portal's own cancelBooking(). Takes no arguments since none are needed —
// callers pass a bookingId anyway (matching markArtistBookingCompleted's
// shape) but it's intentionally ignored.
export async function cancelArtistBooking(): Promise<{ error?: string }> {
  return { error: "Artists cannot cancel bookings from the Artist Portal — contact the studio owner." };
}
