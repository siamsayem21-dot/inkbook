"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { ensureClientAccount } from "@/lib/auth/config";
import { validateImageFile } from "@/lib/file-validation";
import { getThreadIfOwned, getOrCreateThread, postMessage, type MessageRow } from "@/lib/messaging/threads";

export type SendMessageResult = { message?: MessageRow; error?: string };

export async function sendClientMessage(threadId: string, formData: FormData): Promise<SendMessageResult> {
  const account = await ensureClientAccount();
  if (!account) return { error: "Not signed in." };

  const thread = await getThreadIfOwned(threadId, "client", account.id);
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
    senderRole: "client",
    senderClientAccountId: account.id,
    content,
    imageUrl,
  });
  if (result.error) return { error: result.error };
  return { message: result.message };
}

// Used by the "New Conversation" affordance on the standalone /messages list
// (i.e. not scoped to any project) — finds or creates the client's one
// "general" thread for this studio (see the migration's idx_message_threads_general).
export async function startGeneralThread(studioId: string): Promise<{ threadId?: string; error?: string }> {
  const account = await ensureClientAccount();
  if (!account) return { error: "Not signed in." };

  const result = await getOrCreateThread({ studioId, clientAccountId: account.id, consultationId: null });
  if (result.error || !result.thread) return { error: result.error ?? "Failed to start conversation." };
  return { threadId: result.thread.id };
}
