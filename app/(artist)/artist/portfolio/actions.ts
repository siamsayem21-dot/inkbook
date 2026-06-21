"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/config";
import { revalidatePath } from "next/cache";
import { validateImageFile } from "@/lib/file-validation";

async function verifyArtistOwnership(supabase: ReturnType<typeof createAdminClient>, artistId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  const { data } = await supabase.from("artists").select("id").eq("user_id", user.id).eq("id", artistId).maybeSingle();
  return !!data;
}

export type Photo = {
  id: string;
  storage_path: string;
  url: string;
  style: string | null;
};

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function uploadPhoto(
  formData: FormData
): Promise<{ error?: string; photo?: Photo }> {
  const artistId = formData.get("artistId") as string | null;
  const file = formData.get("file") as File | null;

  if (!file || !artistId) return { error: "Missing required fields" };
  if (file.size > MAX_BYTES) return { error: "File must be under 5MB" };

  const typeCheck = await validateImageFile(file);
  if (!typeCheck.valid) return { error: typeCheck.error };

  const supabase = createAdminClient();

  if (!await verifyArtistOwnership(supabase, artistId)) return { error: "Unauthorized" };
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const storagePath = `${artistId}/${Date.now()}.${ext}`;
  const bytes = await file.arrayBuffer();

  // Use service-role client so storage upload bypasses RLS entirely
  const { error: uploadError } = await supabase.storage
    .from("portfolio")
    .upload(storagePath, bytes, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error("[uploadPhoto] storage upload failed:", uploadError.message);
    return { error: `Upload failed: ${uploadError.message}` };
  }

  const { data: urlData } = supabase.storage
    .from("portfolio")
    .getPublicUrl(storagePath);

  const { data: row, error: dbError } = await supabase
    .from("portfolio_photos" as never)
    .insert({ artist_id: artistId, storage_path: storagePath } as never)
    .select("id, storage_path, style")
    .single();

  if (dbError || !row) {
    console.error("[uploadPhoto] DB insert failed:", dbError?.message);
    // Rollback: remove the file we just uploaded
    await supabase.storage.from("portfolio").remove([storagePath]);
    return { error: "Failed to save photo record — please try again" };
  }

  return {
    photo: {
      id: (row as { id: string }).id,
      storage_path: (row as { storage_path: string }).storage_path,
      url: urlData.publicUrl,
      style: (row as { style: string | null }).style,
    },
  };
}

export async function deletePhoto(data: {
  photoId: string;
  storagePath: string;
  artistId: string;
}): Promise<{ error?: string }> {
  const supabase = createAdminClient();

  if (!await verifyArtistOwnership(supabase, data.artistId)) return { error: "Unauthorized" };

  // Remove from storage first (non-fatal if it already doesn't exist)
  await supabase.storage.from("portfolio").remove([data.storagePath]);

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
