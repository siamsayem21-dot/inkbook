"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function saveStudio(data: {
  studioId: string;
  name: string;
  address: string;
  state: string;
}): Promise<{ error?: string }> {
  if (!data.name.trim()) return { error: "Studio name is required" };

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("studios")
    .update({
      name: data.name.trim(),
      address: data.address.trim() || null,
      state: data.state || null,
    } as never)
    .eq("id", data.studioId);

  if (error) {
    console.error("[saveStudio]", error.message);
    return { error: "Failed to save — please try again" };
  }

  revalidatePath("/owner/settings/studio");
  return {};
}
