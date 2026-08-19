"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/config";

// Same shape as verifyArtistOwnership() in app/(artist)/artist/portfolio/actions.ts
// and app/(artist)/artist/flash/actions.ts.
async function verifyArtistOwnership(supabase: ReturnType<typeof createAdminClient>, artistId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  const { data } = await supabase.from("artists").select("id").eq("user_id", user.id).eq("id", artistId).maybeSingle();
  return !!data;
}

export async function saveAvailability(data: {
  artistId: string;
  slots: { day_of_week: number; hour: number }[];
}): Promise<{ error?: string }> {
  const supabase = createAdminClient();

  if (!await verifyArtistOwnership(supabase, data.artistId)) return { error: "Unauthorized" };

  // Delete all existing availability for this artist, then re-insert
  const { error: deleteError } = await supabase
    .from("artist_availability" as never)
    .delete()
    .eq("artist_id" as never, data.artistId);

  if (deleteError) {
    console.error("[saveAvailability] delete failed:", deleteError.message);
    return { error: "Failed to save — please try again" };
  }

  if (data.slots.length === 0) return {};

  const rows = data.slots.map((s) => ({
    artist_id: data.artistId,
    day_of_week: s.day_of_week,
    hour: s.hour,
    is_available: true,
  }));

  const { error: insertError } = await supabase
    .from("artist_availability" as never)
    .insert(rows as never);

  if (insertError) {
    console.error("[saveAvailability] insert failed:", insertError.message);
    return { error: "Failed to save — please try again" };
  }

  return {};
}

// Day-off / unavailable-dates management (Artist Unavailable Dates V1).
// Individual marked-off days, not recurring hours — see
// supabase/migrations/20260818000000_artist_unavailable_dates.sql for why
// this is deliberately the smallest V1 shape. Booking-creation paths reject
// a request for any date in this list — see lib/booking-conflict.ts
// isDateUnavailable() and its 3 call sites.
export async function addUnavailableDate(artistId: string, date: string): Promise<{ error?: string }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Invalid date" };

  const supabase = createAdminClient();
  if (!await verifyArtistOwnership(supabase, artistId)) return { error: "Unauthorized" };

  const { data: artistRow } = await supabase
    .from("artists")
    .select("unavailable_dates")
    .eq("id", artistId)
    .single();
  const current = ((artistRow as { unavailable_dates: string[] | null } | null)?.unavailable_dates) ?? [];

  if (current.includes(date)) return {};

  const { error } = await supabase
    .from("artists")
    .update({ unavailable_dates: [...current, date].sort() } as never)
    .eq("id", artistId);

  if (error) {
    console.error("[addUnavailableDate]", error.message);
    return { error: "Failed to save — please try again" };
  }
  return {};
}

export async function removeUnavailableDate(artistId: string, date: string): Promise<{ error?: string }> {
  const supabase = createAdminClient();
  if (!await verifyArtistOwnership(supabase, artistId)) return { error: "Unauthorized" };

  const { data: artistRow } = await supabase
    .from("artists")
    .select("unavailable_dates")
    .eq("id", artistId)
    .single();
  const current = ((artistRow as { unavailable_dates: string[] | null } | null)?.unavailable_dates) ?? [];

  const { error } = await supabase
    .from("artists")
    .update({ unavailable_dates: current.filter((d) => d !== date) } as never)
    .eq("id", artistId);

  if (error) {
    console.error("[removeUnavailableDate]", error.message);
    return { error: "Failed to save — please try again" };
  }
  return {};
}
