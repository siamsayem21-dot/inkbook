"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function markFlashAsBooked(flashId: string): Promise<{ error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("flash_designs")
    .update({ is_booked: true, is_available: false } as never)
    .eq("id", flashId);

  if (error) {
    console.error("[markFlashAsBooked]", error.message);
    return { error: "Failed to mark design as booked" };
  }

  return {};
}
