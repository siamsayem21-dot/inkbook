"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function markFlashAsBooked(
  flashId: string,
  studioSlug: string
): Promise<{ error?: string }> {
  const supabase = createAdminClient();

  // Resolve studio so we can enforce studio ownership on the flash design
  const { data: studioRaw } = await supabase
    .from("studios")
    .select("id")
    .eq("subdomain", studioSlug)
    .single();

  if (!studioRaw) return { error: "Studio not found" };
  const studioId = (studioRaw as { id: string }).id;

  const { error } = await supabase
    .from("flash_designs")
    .update({ is_booked: true, is_available: false } as never)
    .eq("id", flashId)
    .eq("studio_id" as never, studioId);

  if (error) {
    console.error("[markFlashAsBooked]", error.message);
    return { error: "Failed to mark design as booked" };
  }

  return {};
}
