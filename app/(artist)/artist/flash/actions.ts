"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/config";
import { revalidatePath } from "next/cache";
import { validateImageFile } from "@/lib/file-validation";

const MAX_BYTES = 5 * 1024 * 1024;

function extractStoragePath(imageUrl: string): string | null {
  try {
    const url = new URL(imageUrl);
    const parts = url.pathname.split("/public/portfolio/");
    return parts[1] ?? null;
  } catch {
    return null;
  }
}

async function verifyArtistOwnership(
  supabase: ReturnType<typeof createAdminClient>,
  artistId: string
): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  const { data } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", user.id)
    .eq("id", artistId)
    .maybeSingle();
  return !!data;
}

export async function createFlashDesign(
  formData: FormData
): Promise<{ error?: string; design?: FlashRow }> {
  const artistId   = formData.get("artistId")   as string | null;
  const studioId   = formData.get("studioId")   as string | null;
  const file       = formData.get("file")        as File | null;
  const title      = formData.get("title")       as string | null;
  const description = formData.get("description") as string | null;
  const priceStr   = formData.get("price")       as string | null;
  const category   = formData.get("category")    as string | null;
  const isRepeatable = formData.get("isRepeatable") === "true";
  const isAvailable  = formData.get("isAvailable")  === "true";

  if (!artistId || !studioId || !file || !title?.trim() || !priceStr) {
    return { error: "Title, image, and price are required" };
  }
  if (file.size > MAX_BYTES) return { error: "Image must be under 5 MB" };

  const typeCheck = await validateImageFile(file);
  if (!typeCheck.valid) return { error: typeCheck.error };

  const supabase = createAdminClient();
  if (!await verifyArtistOwnership(supabase, artistId)) return { error: "Unauthorized" };

  const priceDollars = parseFloat(priceStr);
  if (isNaN(priceDollars) || priceDollars < 0) return { error: "Invalid price" };
  const priceCents = Math.round(priceDollars * 100);
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const storagePath = `flash/${artistId}/${Date.now()}.${ext}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("portfolio")
    .upload(storagePath, bytes, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error("[createFlashDesign] upload failed:", uploadError.message);
    return { error: `Upload failed: ${uploadError.message}` };
  }

  const { data: urlData } = supabase.storage.from("portfolio").getPublicUrl(storagePath);

  const { data: row, error: dbError } = await supabase
    .from("flash_designs")
    .insert({
      studio_id:    studioId,
      artist_id:    artistId,
      title:        title.trim(),
      description:  description?.trim() || null,
      image_url:    urlData.publicUrl,
      price:        priceCents,
      category:     category || null,
      is_repeatable: isRepeatable,
      is_available:  isAvailable,
      is_booked:     false,
    } as never)
    .select("id, title, description, image_url, price, category, is_repeatable, is_available, is_booked, created_at")
    .single();

  if (dbError || !row) {
    await supabase.storage.from("portfolio").remove([storagePath]);
    console.error("[createFlashDesign] db insert failed:", dbError?.message);
    return { error: "Failed to save design — please try again" };
  }

  revalidatePath("/artist/flash");
  return { design: row as FlashRow };
}

export type FlashRow = {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  price: number;
  category: string | null;
  is_repeatable: boolean;
  is_available: boolean;
  is_booked: boolean;
  created_at: string;
};

export async function updateFlashDesign(data: {
  id: string;
  artistId: string;
  title: string;
  description: string;
  price: number;
  category: string;
  isRepeatable: boolean;
  isAvailable: boolean;
}): Promise<{ error?: string }> {
  if (!data.title.trim()) return { error: "Title is required" };

  const supabase = createAdminClient();
  if (!await verifyArtistOwnership(supabase, data.artistId)) return { error: "Unauthorized" };

  // markFlashAsBooked() (app/book/[studio]/flash/[flashId]/book/actions.ts)
  // always sets is_booked: true, is_available: false on booking, regardless
  // of is_repeatable. For a repeatable design, re-enabling availability
  // afterward is the intended workflow (offer the same design to the next
  // client). For a non-repeatable (one-off) design, a booked piece is
  // consumed — re-enabling availability would let it be booked again by a
  // second client for a design that can only be tattooed once. is_booked
  // itself is never writable through this action (booking-only), so this
  // check only needs to look at the design's current booked state.
  const { data: currentRow } = await supabase
    .from("flash_designs")
    .select("is_booked")
    .eq("id", data.id)
    .eq("artist_id", data.artistId)
    .maybeSingle();

  if (currentRow && (currentRow as { is_booked: boolean }).is_booked && data.isAvailable && !data.isRepeatable) {
    return { error: "This design has already been booked and isn't repeatable — mark it repeatable to reopen it, or leave it unavailable." };
  }

  const { error } = await supabase
    .from("flash_designs")
    .update({
      title:        data.title.trim(),
      description:  data.description.trim() || null,
      price:        data.price,
      category:     data.category || null,
      is_repeatable: data.isRepeatable,
      is_available:  data.isAvailable,
    } as never)
    .eq("id", data.id)
    .eq("artist_id", data.artistId);

  if (error) {
    console.error("[updateFlashDesign]", error.message);
    return { error: "Failed to update design" };
  }

  revalidatePath("/artist/flash");
  return {};
}

export async function deleteFlashDesign(data: {
  id: string;
  artistId: string;
  imageUrl: string;
}): Promise<{ error?: string }> {
  const supabase = createAdminClient();
  if (!await verifyArtistOwnership(supabase, data.artistId)) return { error: "Unauthorized" };

  const storagePath = extractStoragePath(data.imageUrl);
  if (storagePath) {
    await supabase.storage.from("portfolio").remove([storagePath]);
  }

  const { error } = await supabase
    .from("flash_designs")
    .delete()
    .eq("id", data.id)
    .eq("artist_id", data.artistId);

  if (error) {
    console.error("[deleteFlashDesign]", error.message);
    return { error: "Failed to delete design" };
  }

  revalidatePath("/artist/flash");
  return {};
}
