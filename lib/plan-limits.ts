import { createAdminClient } from "@/lib/supabase/admin";

// Matches app/pricing/page.js's PLANS array (source of truth for plan
// tiers/copy) and studios.plan's CHECK constraint (solo|studio|pro).
// null = unlimited.
export const PLAN_ARTIST_LIMITS: Record<string, number | null> = {
  solo: 1,
  studio: 5,
  pro: null,
};

export function getArtistLimit(plan: string): number | null {
  return plan in PLAN_ARTIST_LIMITS ? PLAN_ARTIST_LIMITS[plan] : PLAN_ARTIST_LIMITS.solo;
}

// A seat is occupied by any artist row still linked to an auth user
// (removeArtist() nulls user_id to free the seat — see
// app/(owner)/owner/artists/actions.ts) or by a pending, non-expired invite
// (artist_invites — reserves the seat until accepted/cancelled/expired, so
// an owner can't invite past their cap and race the acceptance).
export async function isAtArtistLimit(
  supabase: ReturnType<typeof createAdminClient>,
  studioId: string,
  plan: string
): Promise<{ atLimit: boolean; limit: number | null; used: number }> {
  const limit = getArtistLimit(plan);
  if (limit === null) return { atLimit: false, limit: null, used: 0 };

  const { data: activeRows } = await supabase
    .from("artists")
    .select("id")
    .eq("studio_id", studioId)
    .not("user_id", "is", null);

  const { data: pendingRows } = await supabase
    .from("artist_invites")
    .select("id")
    .eq("studio_id", studioId)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString());

  const used = (activeRows ?? []).length + (pendingRows ?? []).length;
  return { atLimit: used >= limit, limit, used };
}
