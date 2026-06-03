"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function saveStudio(data: {
  studioId: string;
  name: string;
  address: string;
  state: string;
  primaryColor: string;
  secondaryColor: string;
  fontChoice: string;
}): Promise<{ error?: string }> {
  if (!data.name.trim()) return { error: "Studio name is required" };

  const hexPattern = /^#[0-9a-fA-F]{6}$/;
  const validFonts = ["default", "bold", "elegant"];

  const primaryColor = hexPattern.test(data.primaryColor) ? data.primaryColor : "#D4AF37";
  const secondaryColor = hexPattern.test(data.secondaryColor) ? data.secondaryColor : "#FFFFFF";
  const fontChoice = validFonts.includes(data.fontChoice) ? data.fontChoice : "default";

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("studios")
    .update({
      name: data.name.trim(),
      address: data.address.trim() || null,
      state: data.state || null,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      font_choice: fontChoice,
    } as never)
    .eq("id", data.studioId);

  if (error) {
    console.error("[saveStudio]", error.message);
    return { error: "Failed to save — please try again" };
  }

  revalidatePath("/owner/settings/studio");
  return {};
}

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export async function uploadLogo(
  formData: FormData
): Promise<{ error?: string; url?: string }> {
  const studioId = formData.get("studioId") as string | null;
  const file = formData.get("file") as File | null;

  if (!file || !studioId) return { error: "Missing required fields" };
  if (file.size > MAX_LOGO_BYTES) return { error: "Logo must be under 2 MB" };

  const supabase = createAdminClient();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const storagePath = `${studioId}/logo.${ext}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("studios")
    .upload(storagePath, bytes, { contentType: file.type, upsert: true });

  if (uploadError) {
    console.error("[uploadLogo] storage upload failed:", uploadError.message);
    return { error: `Upload failed: ${uploadError.message}` };
  }

  const { data: urlData } = supabase.storage.from("studios").getPublicUrl(storagePath);
  const url = `${urlData.publicUrl}?t=${Date.now()}`;

  const { error: dbError } = await supabase
    .from("studios")
    .update({ logo_url: url } as never)
    .eq("id", studioId);

  if (dbError) {
    console.error("[uploadLogo] DB update failed:", dbError.message);
    return { error: "Failed to save logo — please try again" };
  }

  revalidatePath("/owner/settings/studio");
  return { url };
}
