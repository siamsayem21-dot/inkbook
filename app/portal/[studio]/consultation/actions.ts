"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { ensureClientAccount } from "@/lib/auth/config";
import { validateImageFile } from "@/lib/file-validation";
import { runConsultationTurn, type GatheredFields, type ChatMessageRow } from "@/lib/ai-consultation/chat-engine";
import { submitConsultationFromChat } from "@/lib/ai-consultation/submit";

export type SendMessageResult =
  | { error: string }
  | {
      userMessage: { id: string; content: string; image_url: string | null; created_at: string };
      assistantMessage: { id: string; content: string; created_at: string };
      complete: boolean;
      consultationId?: string;
    };

export async function sendMessage(chatId: string, formData: FormData): Promise<SendMessageResult> {
  const account = await ensureClientAccount();
  if (!account) return { error: "Not signed in." };

  const content = ((formData.get("content") as string | null) ?? "").trim();
  const file = formData.get("image") as File | null;

  if (!content && (!file || file.size === 0)) {
    return { error: "Type a message or attach an image." };
  }

  const supabase = createAdminClient();

  const { data: chatRow } = await supabase
    .from("ai_chats")
    .select("id, studio_id, client_account_id, status, gathered")
    .eq("id", chatId)
    .maybeSingle();

  const chat = chatRow as
    | { id: string; studio_id: string; client_account_id: string; status: string; gathered: GatheredFields }
    | null;

  if (!chat || chat.client_account_id !== account.id) return { error: "Consultation not found." };
  if (chat.status !== "active") return { error: "This consultation has already been submitted." };

  const { data: studioRow } = await supabase
    .from("studios")
    .select("name")
    .eq("id", chat.studio_id)
    .maybeSingle();
  const studioName = (studioRow as { name: string } | null)?.name ?? "the studio";

  let imageUrl: string | null = null;
  if (file && file.size > 0) {
    if (file.size > 8 * 1024 * 1024) return { error: "Image must be under 8MB." };
    const check = await validateImageFile(file);
    if (!check.valid) return { error: check.error };

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `ai-chat/${chat.studio_id}/${chat.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const bytes = await file.arrayBuffer();
    const { error: upErr } = await supabase.storage
      .from("custom-requests")
      .upload(path, bytes, { contentType: file.type, upsert: false });
    if (upErr) return { error: "Failed to upload image — please try again." };
    imageUrl = supabase.storage.from("custom-requests").getPublicUrl(path).data.publicUrl;
  }

  const { data: userMsgRow, error: userMsgErr } = await supabase
    .from("ai_chat_messages")
    .insert({ chat_id: chat.id, role: "user", content, image_url: imageUrl } as never)
    .select("id, content, image_url, created_at")
    .single();
  if (userMsgErr || !userMsgRow) return { error: "Failed to send message — please try again." };

  const { data: historyRows } = await supabase
    .from("ai_chat_messages")
    .select("role, content, image_url")
    .eq("chat_id", chat.id)
    .order("created_at", { ascending: true });

  const turn = await runConsultationTurn({
    studioId: chat.studio_id,
    studioName,
    history: (historyRows ?? []) as ChatMessageRow[],
    gathered: chat.gathered ?? {},
  });

  const { data: assistantMsgRow, error: assistantMsgErr } = await supabase
    .from("ai_chat_messages")
    .insert({ chat_id: chat.id, role: "assistant", content: turn.reply } as never)
    .select("id, content, created_at")
    .single();
  if (assistantMsgErr || !assistantMsgRow) return { error: "Failed to get a response — please try again." };

  await supabase
    .from("ai_chats")
    .update({ gathered: turn.gathered } as never)
    .eq("id", chat.id);

  let consultationId: string | undefined;
  if (turn.complete) {
    const result = await submitConsultationFromChat({
      chatId: chat.id,
      studioId: chat.studio_id,
      clientEmail: account.email,
      gathered: turn.gathered,
    });
    // If submission fails, ai_chats.status stays "active" — the client can keep
    // chatting and completion will be retried on a later turn rather than
    // getting stuck on a broken success state.
    if ("consultationId" in result) consultationId = result.consultationId;
  }

  return {
    userMessage: userMsgRow as { id: string; content: string; image_url: string | null; created_at: string },
    assistantMessage: assistantMsgRow as { id: string; content: string; created_at: string },
    complete: turn.complete && Boolean(consultationId),
    consultationId,
  };
}
