"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function deletePhoto(data: {
  photoId: string;
  storagePath: string;
  artistId: string;
}): Promise<{ error?: string }> {
  const supabase = createAdminClient();

  // Remove from storage
  await supabase.storage.from("portfolio").remove([data.storagePath]);

  // Remove DB record
  const { error } = await supabase
    .from("portfolio_photos" as never)
    .delete()
    .eq("id" as never, data.photoId)
    .eq("artist_id" as never, data.artistId);

  if (error) {
    console.error("[deletePhoto] delete failed:", error.message);
    return { error: "Failed to delete photo" };
  }

  revalidatePath("/artist/portfolio");
  return {};
}
