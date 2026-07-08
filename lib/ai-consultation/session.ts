import { createAdminClient } from "@/lib/supabase/admin";
import type { ChatMessageRow, GatheredFields } from "./chat-engine";

export type ChatRow = {
  id: string;
  studio_id: string;
  client_account_id: string;
  status: "active" | "submitted";
  gathered: GatheredFields;
  consultation_id: string | null;
  created_at: string;
};

export type StoredMessage = ChatMessageRow & { id: string; created_at: string };

function greeting(studioName: string): string {
  return `Hi! I'm here to gather a few details for your tattoo consultation with ${studioName}. To start — what's your name?`;
}

// Resumes the client's active (unsubmitted) chat for this studio, or starts a
// new one (seeded with an opening greeting) if none exists yet. This is what
// makes "leave and come back later" work — the caller always gets the same
// row back until it's submitted.
export async function getOrCreateActiveChat(
  studio: { id: string; name: string },
  clientAccountId: string
): Promise<{ chat: ChatRow; messages: StoredMessage[] }> {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("ai_chats")
    .select("id, studio_id, client_account_id, status, gathered, consultation_id, created_at")
    .eq("studio_id", studio.id)
    .eq("client_account_id", clientAccountId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let chat = existing as ChatRow | null;

  if (!chat) {
    const { data: created, error } = await supabase
      .from("ai_chats")
      .insert({ studio_id: studio.id, client_account_id: clientAccountId } as never)
      .select("id, studio_id, client_account_id, status, gathered, consultation_id, created_at")
      .single();

    if (error || !created) throw new Error(error?.message ?? "Failed to start consultation chat");
    chat = created as ChatRow;

    await supabase
      .from("ai_chat_messages")
      .insert({ chat_id: chat.id, role: "assistant", content: greeting(studio.name) } as never);
  }

  const { data: messageRows } = await supabase
    .from("ai_chat_messages")
    .select("id, role, content, image_url, created_at")
    .eq("chat_id", chat.id)
    .order("created_at", { ascending: true });

  return { chat, messages: (messageRows ?? []) as StoredMessage[] };
}

// Fetches the most recent submitted chat (if any) so the page can show the
// project timeline for a consultation the client already submitted.
export async function getLatestSubmittedConsultation(
  studioId: string,
  clientAccountId: string
): Promise<{ id: string; status: string } | null> {
  const supabase = createAdminClient();

  const { data: chat } = await supabase
    .from("ai_chats")
    .select("consultation_id")
    .eq("studio_id", studioId)
    .eq("client_account_id", clientAccountId)
    .eq("status", "submitted")
    .not("consultation_id", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const consultationId = (chat as { consultation_id: string | null } | null)?.consultation_id;
  if (!consultationId) return null;

  const { data: consult } = await supabase
    .from("consultations")
    .select("id, status")
    .eq("id", consultationId)
    .maybeSingle();

  return consult as { id: string; status: string } | null;
}
