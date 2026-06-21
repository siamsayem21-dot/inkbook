"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { validateImageFile } from "@/lib/file-validation";
import {
  sendCustomRequestReceivedEmail,
  sendCustomRequestClientConfirmationEmail,
} from "@/lib/email";

export async function submitCustomRequest(
  formData: FormData
): Promise<{ id?: string; error?: string }> {
  const studioId        = formData.get("studioId")       as string | null;
  const studioSlug      = formData.get("studioSlug")     as string | null;
  const studioName      = formData.get("studioName")     as string | null;
  const artistId        = formData.get("artistId")       as string | null;
  const clientName      = (formData.get("clientName")    as string | null)?.trim();
  const clientEmail     = (formData.get("clientEmail")   as string | null)?.trim();
  const clientPhone     = (formData.get("clientPhone")   as string | null)?.trim();
  const style           = formData.get("style")          as string | null;
  const placement       = (formData.get("placement")     as string | null)?.trim();
  const size            = formData.get("size")           as string | null;
  const budgetRange     = formData.get("budgetRange")    as string | null;
  const description     = (formData.get("description")   as string | null)?.trim();
  const availabilityNote = (formData.get("availabilityNote") as string | null)?.trim();
  const photoFiles      = formData.getAll("photos")      as File[];

  if (!studioId || !studioSlug || !studioName || !clientName || !clientEmail ||
      !clientPhone || !style || !placement || !size || !budgetRange || !description) {
    return { error: "Missing required fields" };
  }

  const supabase = createAdminClient();

  // Upload reference photos via admin client (bypasses RLS)
  const photoUrls: string[] = [];
  for (const file of photoFiles) {
    if (!file || file.size === 0) continue;
    if (file.size > 5 * 1024 * 1024) continue;
    const typeCheck = await validateImageFile(file);
    if (!typeCheck.valid) continue; // skip non-image files silently
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${studioId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const bytes = await file.arrayBuffer();
    const { error: upErr } = await supabase.storage
      .from("custom-requests")
      .upload(path, bytes, { contentType: file.type, upsert: false });
    if (!upErr) {
      const { data } = supabase.storage.from("custom-requests").getPublicUrl(path);
      photoUrls.push(data.publicUrl);
    }
  }

  const { data: req, error } = await supabase
    .from("custom_requests")
    .insert({
      studio_id:         studioId,
      artist_id:         artistId || null,
      client_name:       clientName,
      client_email:      clientEmail,
      client_phone:      clientPhone,
      style,
      design_description: description,
      placement,
      size,
      budget_range:      budgetRange,
      preferred_dates:   availabilityNote ?? "",
      reference_photos:  photoUrls,
      status:            "pending",
    } as never)
    .select("id")
    .single();

  if (error || !req) {
    console.error("[submitCustomRequest] insert:", error?.message);
    return { error: "Failed to save your request — please try again" };
  }

  const newId = (req as { id: string }).id;

  // Notify artist or studio owner
  let recipientEmail: string | null = null;
  let recipientName = "Studio Owner";

  if (artistId) {
    const { data: a } = await supabase
      .from("artists").select("name, email").eq("id", artistId).single();
    if (a) {
      const row = a as { name: string; email: string };
      recipientEmail = row.email;
      recipientName  = row.name;
    }
  } else {
    const { data: s } = await supabase
      .from("studios").select("owner_id").eq("id", studioId).single();
    if (s) {
      const { data: u } = await supabase.auth.admin.getUserById(
        (s as { owner_id: string }).owner_id
      );
      recipientEmail = u?.user?.email ?? null;
    }
  }

  if (recipientEmail) {
    void sendCustomRequestReceivedEmail({
      to:                recipientEmail,
      artistName:        recipientName,
      clientName,
      studioName,
      requestId:         newId,
      designDescription: `${style}: ${description}`,
      placement,
      size,
      budgetRange,
    });
  }

  void sendCustomRequestClientConfirmationEmail({
    to:         clientEmail,
    clientName,
    studioName,
    requestId:  newId,
    studioSlug,
  });

  return { id: newId };
}
