"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/config";
import { revalidatePath } from "next/cache";
import { validateImageFile } from "@/lib/file-validation";

async function getOwnedArtist(
  supabase: ReturnType<typeof createAdminClient>,
  artistId: string
): Promise<{ id: string; studio_id: string } | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data } = await supabase
    .from("artists")
    .select("id, studio_id")
    .eq("user_id", user.id)
    .eq("id", artistId)
    .maybeSingle();
  return data as { id: string; studio_id: string } | null;
}

export type Photo = {
  id: string;
  url: string;
  style: string | null;
};

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// Extracts the storage bucket + object path from a Supabase public storage
// URL (".../storage/v1/object/public/<bucket>/<path>"). Handles both the
// canonical "portfolios" bucket and legacy "portfolio" (singular) bucket
// URLs from rows migrated in before this table/bucket was corrected — see
// TASKS.md Artist Portfolio 1-2/10 for why both can exist.
function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  const marker = "/storage/v1/object/public/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const rest = url.slice(idx + marker.length);
  const slash = rest.indexOf("/");
  if (slash === -1) return null;
  return { bucket: rest.slice(0, slash), path: rest.slice(slash + 1) };
}

export async function uploadPhoto(
  formData: FormData
): Promise<{ error?: string; photo?: Photo }> {
  const artistId = formData.get("artistId") as string | null;
  const file = formData.get("file") as File | null;
  const style = ((formData.get("style") as string | null) ?? "").trim() || null;

  if (!file || !artistId) return { error: "Missing required fields" };
  if (file.size > MAX_BYTES) return { error: "File must be under 5MB" };

  const typeCheck = await validateImageFile(file);
  if (!typeCheck.valid) return { error: typeCheck.error };

  const supabase = createAdminClient();

  const artist = await getOwnedArtist(supabase, artistId);
  if (!artist) return { error: "Unauthorized" };

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const storagePath = `${artistId}/${Date.now()}.${ext}`;
  const bytes = await file.arrayBuffer();

  // Use service-role client so storage upload bypasses RLS entirely.
  // "portfolios" is the canonical, migration-tracked bucket (public read,
  // 10MB limit, JPEG/PNG/WebP-only at the bucket level) that
  // lib/studio-content.ts's getPortfolioImages() and the public studio page
  // already expect — not the untracked "portfolio" (singular) bucket the
  // old version of this file wrote to.
  const { error: uploadError } = await supabase.storage
    .from("portfolios")
    .upload(storagePath, bytes, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error("[uploadPhoto] storage upload failed:", uploadError.message);
    return { error: `Upload failed: ${uploadError.message}` };
  }

  const { data: urlData } = supabase.storage
    .from("portfolios")
    .getPublicUrl(storagePath);

  const { data: row, error: dbError } = await supabase
    .from("portfolio_images")
    .insert({
      studio_id: artist.studio_id,
      artist_id: artistId,
      image_url: urlData.publicUrl,
      style,
    } as never)
    .select("id, image_url, style")
    .single();

  if (dbError || !row) {
    console.error("[uploadPhoto] DB insert failed:", dbError?.message);
    // Rollback: remove the file we just uploaded
    await supabase.storage.from("portfolios").remove([storagePath]);
    return { error: "Failed to save photo record — please try again" };
  }

  const saved = row as { id: string; image_url: string; style: string | null };
  return {
    photo: {
      id: saved.id,
      url: saved.image_url,
      style: saved.style,
    },
  };
}

export async function updatePhotoStyle(data: {
  photoId: string;
  artistId: string;
  style: string | null;
}): Promise<{ error?: string }> {
  const supabase = createAdminClient();
  const artist = await getOwnedArtist(supabase, data.artistId);
  if (!artist) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("portfolio_images")
    .update({ style: data.style?.trim() || null } as never)
    .eq("id", data.photoId)
    .eq("artist_id", data.artistId);

  if (error) {
    console.error("[updatePhotoStyle] update failed:", error.message);
    return { error: "Failed to update style" };
  }

  revalidatePath("/artist/portfolio");
  return {};
}

const ACCEPTED_STYLES = new Set([
  "Traditional", "Neo-traditional", "Japanese", "Blackwork", "Realism",
  "Watercolor", "Geometric", "Tribal", "Fine line", "Illustrative",
  "New school", "Chicano", "Portrait", "Surrealism", "Minimalist",
]);

// Persists the artist's accepted-styles list (artists.styles) — the field
// clients filter by on the public booking page. Previously StyleSelector
// rendered with no props at all (no initialStyles, no onChange handler), so
// toggling a style never loaded or saved anything; every artist's accepted
// styles has been a permanently-empty array since the field was added.
export async function saveArtistStyles(
  artistId: string,
  styles: string[]
): Promise<{ error?: string }> {
  const supabase = createAdminClient();
  const artist = await getOwnedArtist(supabase, artistId);
  if (!artist) return { error: "Unauthorized" };

  const cleaned = Array.from(new Set(styles)).filter((s) => ACCEPTED_STYLES.has(s));

  const { error } = await supabase
    .from("artists")
    .update({ styles: cleaned } as never)
    .eq("id", artistId);

  if (error) {
    console.error("[saveArtistStyles] update failed:", error.message);
    return { error: "Failed to save styles" };
  }

  revalidatePath("/artist/portfolio");
  return {};
}

export async function deletePhoto(data: {
  photoId: string;
  imageUrl: string;
  artistId: string;
}): Promise<{ error?: string }> {
  const supabase = createAdminClient();

  const artist = await getOwnedArtist(supabase, data.artistId);
  if (!artist) return { error: "Unauthorized" };

  // Remove from storage first (non-fatal if it already doesn't exist).
  const parsed = parseStorageUrl(data.imageUrl);
  if (parsed) {
    await supabase.storage.from(parsed.bucket).remove([parsed.path]);
  }

  const { error } = await supabase
    .from("portfolio_images")
    .delete()
    .eq("id", data.photoId)
    .eq("artist_id", data.artistId);

  if (error) {
    console.error("[deletePhoto] delete failed:", error.message);
    return { error: "Failed to delete photo" };
  }

  revalidatePath("/artist/portfolio");
  return {};
}
