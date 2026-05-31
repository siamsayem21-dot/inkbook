"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function saveAvailability(data: {
  artistId: string;
  slots: { day_of_week: number; hour: number }[];
}): Promise<{ error?: string }> {
  const supabase = createAdminClient();

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
