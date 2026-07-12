"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/config";
import { validateImageFile } from "@/lib/file-validation";
import { getThreadIfOwned, postMessage, type MessageRow } from "@/lib/messaging/threads";

export type SendMessageResult = { message?: MessageRow; error?: string };

// Resolves the signed-in artist's `artists.id` — the correct pattern (see
// app/(artist)/artist/requests/[id]/page.tsx), not the hardcoded ARTIST_ID
// found in app/(artist)/artist/bookings/[bookingId]/page.tsx.
async function resolveArtistId(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = createAdminClient();
  const { data } = await supabase.from("artists").select("id").eq("user_id", user.id).maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

export async function sendArtistMessage(threadId: string, formData: FormData): Promise<SendMessageResult> {
  const artistId = await resolveArtistId();
  if (!artistId) return { error: "Unauthorized" };

  const thread = await getThreadIfOwned(threadId, "artist", artistId);
  if (!thread) return { error: "Conversation not found." };

  const content = ((formData.get("content") as string | null) ?? "").trim();
  const file = formData.get("image") as File | null;
  if (!content && (!file || file.size === 0)) {
    return { error: "Type a message or attach an image." };
  }

  const supabase = createAdminClient();
  let imageUrl: string | null = null;
  if (file && file.size > 0) {
    if (file.size > 8 * 1024 * 1024) return { error: "Image must be under 8MB." };
    const check = await validateImageFile(file);
    if (!check.valid) return { error: check.error };

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `messages/${thread.studio_id}/${thread.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const bytes = await file.arrayBuffer();
    const { error: upErr } = await supabase.storage
      .from("custom-requests")
      .upload(path, bytes, { contentType: file.type, upsert: false });
    if (upErr) return { error: "Failed to upload image — please try again." };
    imageUrl = supabase.storage.from("custom-requests").getPublicUrl(path).data.publicUrl;
  }

  const result = await postMessage({
    threadId: thread.id,
    senderRole: "artist",
    senderArtistId: artistId,
    content,
    imageUrl,
  });
  if (result.error) return { error: result.error };
  return { message: result.message };
}
