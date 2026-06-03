"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

function extractStoragePath(imageUrl: string): string | null {
  try {
    const url = new URL(imageUrl);
    const parts = url.pathname.split("/public/portfolio/");
    return parts[1] ?? null;
  } catch {
    return null;
  }
}

export async function toggleFlashAvailability(data: {
  id: string;
  isAvailable: boolean;
}): Promise<{ error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("flash_designs")
    .update({ is_available: data.isAvailable } as never)
    .eq("id", data.id);

  if (error) {
    console.error("[toggleFlashAvailability]", error.message);
    return { error: "Failed to update availability" };
  }

  revalidatePath("/owner/flash");
  return {};
}

export async function deleteFlashDesignOwner(data: {
  id: string;
  imageUrl: string;
}): Promise<{ error?: string }> {
  const supabase = createAdminClient();

  const storagePath = extractStoragePath(data.imageUrl);
  if (storagePath) {
    await supabase.storage.from("portfolio").remove([storagePath]);
  }

  const { error } = await supabase
    .from("flash_designs")
    .delete()
    .eq("id", data.id);

  if (error) {
    console.error("[deleteFlashDesignOwner]", error.message);
    return { error: "Failed to delete design" };
  }

  revalidatePath("/owner/flash");
  return {};
}
