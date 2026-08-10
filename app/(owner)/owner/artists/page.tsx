export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioId } from "@/lib/auth/config";
import { getArtistLimit } from "@/lib/plan-limits";
import ArtistsClient, { type Artist } from "./ArtistsClient";

type ArtistRow = {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  styles: string[];
  minimum_rate_cents: number;
  is_active: boolean;
  created_at: string;
};
type InviteRow = { id: string; invited_name: string; invited_email: string; created_at: string };
type CountableRow = { artist_id: string | null };
type BookingRow = { artist_id: string; date: string | null; status: string };
type ConsultRow = { artist_id: string | null; status: string };
type AvailabilityRow = { artist_id: string; is_available: boolean };

// Terminal lead statuses — mirrors lib/pipeline.ts's TERMINAL_STATUSES plus the
// legacy "converted" alias (see getStage() in lib/pipeline.ts) — an artist's
// "active consultations" count should only reflect work still in motion.
const TERMINAL_CONSULT_STATUSES = new Set(["completed", "lost", "converted"]);

function groupCount<T extends CountableRow>(rows: T[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of rows) {
    if (!r.artist_id) continue;
    counts[r.artist_id] = (counts[r.artist_id] ?? 0) + 1;
  }
  return counts;
}

export default async function ArtistsPage() {
  const studioId = await getStudioId();
  if (!studioId) redirect("/login");

  const supabase = createAdminClient();

  const [{ data: artistsRaw }, { data: invitesRaw }, { data: studioRaw }] = await Promise.all([
    supabase
      .from("artists")
      .select("id, user_id, name, email, avatar_url, bio, styles, minimum_rate_cents, is_active, created_at")
      .eq("studio_id", studioId)
      .order("name"),

    supabase
      .from("artist_invites")
      .select("id, invited_name, invited_email, created_at")
      .eq("studio_id", studioId)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at"),

    supabase.from("studios").select("plan").eq("id", studioId).maybeSingle(),
  ]);

  const artists = (artistsRaw ?? []) as ArtistRow[];
  const invites = (invitesRaw ?? []) as InviteRow[];
  const artistIds = artists.map((a) => a.id);
  const today = new Date().toISOString().split("T")[0];

  // Per-artist counts — same "fetch this studio's full set, group in JS"
  // pattern already used by the Dashboard/Pipeline pages (no per-artist round
  // trips). portfolio_images/flash_designs/bookings/consultations all carry
  // studio_id directly; artist_availability does not (no studio_id column),
  // so it's scoped via artist_id IN (this studio's artist ids) instead.
  //
  // Known schema debt (not fixed here): artist_availability exists live in
  // production (id, artist_id, day_of_week, hour, is_available, created_at)
  // but has no corresponding file under supabase/migrations/ — same
  // untracked-drift pattern documented for custom_requests.preferred_dates.
  // Only read here; out of scope for this module to reconcile.
  const [
    { data: portfolioRaw },
    { data: flashRaw },
    { data: bookingsRaw },
    { data: consultRaw },
    { data: availRaw },
  ] = await Promise.all([
    supabase.from("portfolio_images").select("artist_id").eq("studio_id", studioId),
    supabase.from("flash_designs").select("artist_id").eq("studio_id", studioId),
    supabase.from("bookings").select("artist_id, date, status").eq("studio_id", studioId),
    supabase.from("consultations").select("artist_id, status").eq("studio_id" as never, studioId).not("artist_id", "is", null),
    artistIds.length
      ? supabase.from("artist_availability" as never).select("artist_id, is_available").in("artist_id" as never, artistIds)
      : Promise.resolve({ data: [] as AvailabilityRow[] }),
  ]);

  const portfolioCounts = groupCount((portfolioRaw ?? []) as CountableRow[]);
  const flashCounts = groupCount((flashRaw ?? []) as CountableRow[]);

  // "Upcoming" bookings — same rule as this page's own getUpcomingBookingsCount()
  // in actions.ts (used by the Remove-artist confirmation): scheduled strictly
  // after today, not cancelled/no-show.
  const upcomingBookings = ((bookingsRaw ?? []) as BookingRow[]).filter(
    (b) => b.date != null && b.date > today && b.status !== "cancelled" && b.status !== "no_show"
  );
  const upcomingCounts = groupCount(upcomingBookings);

  const activeConsults = ((consultRaw ?? []) as ConsultRow[]).filter(
    (c) => !TERMINAL_CONSULT_STATUSES.has(c.status)
  );
  const activeConsultCounts = groupCount(activeConsults);

  const availabilityCounts: Record<string, number> = {};
  for (const r of (availRaw ?? []) as AvailabilityRow[]) {
    if (!r.is_available) continue;
    availabilityCounts[r.artist_id] = (availabilityCounts[r.artist_id] ?? 0) + 1;
  }

  const realRows: Artist[] = artists.map((a) => ({
    id: a.id,
    invite_id: undefined,
    user_id: a.user_id,
    name: a.name,
    email: a.email,
    avatar_url: a.avatar_url,
    bio: a.bio,
    styles: a.styles ?? [],
    minimum_rate_cents: a.minimum_rate_cents,
    is_active: a.is_active,
    created_at: a.created_at,
    portfolioCount: portfolioCounts[a.id] ?? 0,
    flashCount: flashCounts[a.id] ?? 0,
    upcomingCount: upcomingCounts[a.id] ?? 0,
    activeConsultCount: activeConsultCounts[a.id] ?? 0,
    availabilitySlots: availabilityCounts[a.id] ?? 0,
  }));

  const pendingRows: Artist[] = invites.map((inv) => ({
    id: inv.id,
    invite_id: inv.id,
    user_id: null,
    name: inv.invited_name,
    email: inv.invited_email,
    avatar_url: null,
    bio: null,
    styles: [],
    minimum_rate_cents: 0,
    is_active: false,
    created_at: inv.created_at,
    portfolioCount: 0,
    flashCount: 0,
    upcomingCount: 0,
    activeConsultCount: 0,
    availabilitySlots: 0,
  }));

  const allRows: Artist[] = [...realRows, ...pendingRows];

  const plan = (studioRaw as { plan: string } | null)?.plan ?? "solo";
  const seatLimit = getArtistLimit(plan);
  const seatsUsed = artists.filter((a) => a.user_id).length + invites.length;

  return (
    <ArtistsClient
      artists={allRows}
      studioId={studioId}
      seatsUsed={seatsUsed}
      seatLimit={seatLimit}
    />
  );
}
