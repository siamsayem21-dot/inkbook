"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/config";
import { saveConsultationQuote } from "@/app/book/[studio]/consult/actions";

// Thin artist-scoped wrapper around the existing saveConsultationQuote()
// (app/book/[studio]/consult/actions.ts) — reused unchanged so terminal-state
// and forward-only-transition guards stay identical to the Owner flow. This
// wrapper only adds the artist-identity check that action doesn't have:
// an artist may only quote a consultation that's unclaimed (artist_id IS
// NULL) or already assigned to them — never one assigned to a different
// artist at the same studio. Claims the consultation (sets artist_id) on
// first save if it was previously unclaimed.
//
// The initial fetch is scoped with the same .or() filter as the list/detail
// pages, so a consultation assigned to a different artist simply doesn't
// come back — it fails with the exact same "not found" error as a
// nonexistent id, never a distinct "assigned to someone else" message that
// would leak the fact that it exists.
export async function saveArtistConsultationQuote(
  id: string,
  data: {
    priceLow: number;
    priceHigh: number;
    sessions: number;
    hoursRange: string;
    difficulty: string;
    reasoning: string;
    finalPrice: number;
    finalSessions: number;
    notes: string;
  }
): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  const supabase = createAdminClient();

  const { data: artistRaw } = await supabase
    .from("artists")
    .select("id, studio_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const artist = artistRaw as { id: string; studio_id: string } | null;
  if (!artist) return { error: "Unauthorized" };

  const { data: consultRaw } = await supabase
    .from("consultations")
    .select("id, studio_id, artist_id")
    .eq("id", id)
    .eq("studio_id", artist.studio_id)
    .or(`artist_id.eq.${artist.id},artist_id.is.null`)
    .maybeSingle();
  const consult = consultRaw as { id: string; studio_id: string; artist_id: string | null } | null;
  if (!consult) return { error: "Consultation not found." };

  const result = await saveConsultationQuote(id, data);
  if (result.error) return result;

  if (!consult.artist_id) {
    await supabase
      .from("consultations")
      .update({ artist_id: artist.id } as never)
      .eq("id", id)
      .eq("studio_id", artist.studio_id);
  }

  return {};
}
