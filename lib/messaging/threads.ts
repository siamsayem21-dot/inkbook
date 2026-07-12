import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendOwnerNewMessageEmail,
  sendArtistNewMessageEmail,
  sendClientNewMessageEmail,
} from "@/lib/email";

export type SenderRole = "client" | "owner" | "artist";

export type ThreadRow = {
  id: string;
  studio_id: string;
  client_account_id: string;
  consultation_id: string | null;
  artist_id: string | null;
  client_last_read_at: string | null;
  studio_last_read_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MessageRow = {
  id: string;
  thread_id: string;
  sender_role: SenderRole;
  sender_client_account_id: string | null;
  sender_artist_id: string | null;
  content: string;
  image_url: string | null;
  created_at: string;
};

export type ThreadSummary = ThreadRow & {
  lastMessage: MessageRow | null;
  unread: boolean;
};

// "client" viewers check client_last_read_at against the latest non-client
// message; "studio" viewers (owner + assigned artist share one cursor, see
// the migration's studio_last_read_at comment) check studio_last_read_at
// against the latest client message.
function attachSummary(thread: ThreadRow, lastMessage: MessageRow | null, viewerSide: "client" | "studio"): ThreadSummary {
  let unread = false;
  if (lastMessage) {
    if (viewerSide === "client" && lastMessage.sender_role !== "client") {
      unread = !thread.client_last_read_at || lastMessage.created_at > thread.client_last_read_at;
    } else if (viewerSide === "studio" && lastMessage.sender_role === "client") {
      unread = !thread.studio_last_read_at || lastMessage.created_at > thread.studio_last_read_at;
    }
  }
  return { ...thread, lastMessage, unread };
}

async function attachSummaries(
  supabase: ReturnType<typeof createAdminClient>,
  threads: ThreadRow[],
  viewerSide: "client" | "studio"
): Promise<ThreadSummary[]> {
  if (threads.length === 0) return [];

  const { data: msgRows } = await supabase
    .from("messages")
    .select("*")
    .in("thread_id", threads.map((t) => t.id))
    .order("created_at", { ascending: false });

  const lastByThread = new Map<string, MessageRow>();
  for (const m of (msgRows ?? []) as MessageRow[]) {
    if (!lastByThread.has(m.thread_id)) lastByThread.set(m.thread_id, m);
  }

  return threads
    .map((t) => attachSummary(t, lastByThread.get(t.id) ?? null, viewerSide))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

type GetOrCreateParams = {
  studioId: string;
  clientAccountId: string;
  consultationId?: string | null;
  artistId?: string | null;
};

// Finds the existing project-scoped (or general) thread for this client+studio,
// creating one if none exists. Handles the unique-index race (double-click,
// two open tabs) the same way getOrCreateDepositCheckoutSession
// (lib/stripe/deposit-checkout.ts) reuses an existing Stripe session — attempt
// insert, fall back to re-select on conflict rather than erroring.
export async function getOrCreateThread(params: GetOrCreateParams): Promise<{ thread?: ThreadRow; error?: string }> {
  const { studioId, clientAccountId, consultationId = null, artistId = null } = params;
  const supabase = createAdminClient();

  const findExisting = async () => {
    let query = supabase
      .from("message_threads")
      .select("*")
      .eq("studio_id", studioId)
      .eq("client_account_id", clientAccountId);
    query = consultationId ? query.eq("consultation_id", consultationId) : query.is("consultation_id", null);
    const { data } = await query.maybeSingle();
    return data as ThreadRow | null;
  };

  const existing = await findExisting();
  if (existing) return { thread: existing };

  const { data: inserted, error: insertError } = await supabase
    .from("message_threads")
    .insert({
      studio_id: studioId,
      client_account_id: clientAccountId,
      consultation_id: consultationId,
      artist_id: artistId,
    } as never)
    .select("*")
    .single();

  if (!insertError && inserted) return { thread: inserted as ThreadRow };

  // Unique violation from a concurrent request — re-select instead of failing.
  const retried = await findExisting();
  if (retried) return { thread: retried };

  console.error("[getOrCreateThread] insert failed and no existing row found:", insertError?.message);
  return { error: "Failed to open conversation — please try again." };
}

export async function getThreadIfOwned(
  threadId: string,
  role: SenderRole,
  ownerId: string
): Promise<ThreadRow | null> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("message_threads").select("*").eq("id", threadId).maybeSingle();
  const thread = data as ThreadRow | null;
  if (!thread) return null;

  if (role === "client" && thread.client_account_id === ownerId) return thread;
  if (role === "owner" && thread.studio_id === ownerId) return thread;
  if (role === "artist" && thread.artist_id === ownerId) return thread;
  return null;
}

export async function listThreadsForClient(studioId: string, clientAccountId: string): Promise<ThreadSummary[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("message_threads")
    .select("*")
    .eq("studio_id", studioId)
    .eq("client_account_id", clientAccountId);
  return attachSummaries(supabase, (data ?? []) as ThreadRow[], "client");
}

export async function listThreadsForStudio(studioId: string): Promise<ThreadSummary[]> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("message_threads").select("*").eq("studio_id", studioId);
  return attachSummaries(supabase, (data ?? []) as ThreadRow[], "studio");
}

export async function listThreadsForArtist(artistId: string): Promise<ThreadSummary[]> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("message_threads").select("*").eq("artist_id", artistId);
  return attachSummaries(supabase, (data ?? []) as ThreadRow[], "studio");
}

export async function listMessages(threadId: string): Promise<MessageRow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  return (data ?? []) as MessageRow[];
}

export async function markThreadRead(threadId: string, side: "client" | "studio"): Promise<void> {
  const supabase = createAdminClient();
  const column = side === "client" ? "client_last_read_at" : "studio_last_read_at";
  const { error } = await supabase
    .from("message_threads")
    .update({ [column]: new Date().toISOString() } as never)
    .eq("id", threadId);
  if (error) console.error("[markThreadRead] update failed:", error.message);
}

type PostMessageParams = {
  threadId: string;
  senderRole: SenderRole;
  senderClientAccountId?: string | null;
  senderArtistId?: string | null;
  content: string;
  imageUrl?: string | null;
};

// Inserts the message, bumps the thread's updated_at, and fires a
// best-effort notification to the other side. Never throws back to the
// caller — a notification failure must not fail the send.
export async function postMessage(params: PostMessageParams): Promise<{ message?: MessageRow; error?: string }> {
  const { threadId, senderRole, senderClientAccountId = null, senderArtistId = null, content, imageUrl = null } = params;
  const trimmed = content.trim();
  if (!trimmed && !imageUrl) return { error: "Type a message or attach an image." };

  const supabase = createAdminClient();

  const { data: inserted, error: insertError } = await supabase
    .from("messages")
    .insert({
      thread_id: threadId,
      sender_role: senderRole,
      sender_client_account_id: senderClientAccountId,
      sender_artist_id: senderArtistId,
      content: trimmed,
      image_url: imageUrl,
    } as never)
    .select("*")
    .single();

  if (insertError || !inserted) {
    console.error("[postMessage] insert failed:", insertError?.message);
    return { error: "Failed to send message — please try again." };
  }

  const message = inserted as MessageRow;

  await supabase
    .from("message_threads")
    .update({ updated_at: new Date().toISOString() } as never)
    .eq("id", threadId);

  void notifyNewMessage(supabase, threadId, message).catch((err) => {
    console.error("[postMessage] notification failed:", err);
  });

  return { message };
}

async function notifyNewMessage(
  supabase: ReturnType<typeof createAdminClient>,
  threadId: string,
  message: MessageRow
): Promise<void> {
  const { data: threadRow } = await supabase.from("message_threads").select("*").eq("id", threadId).maybeSingle();
  const thread = threadRow as ThreadRow | null;
  if (!thread) return;

  const { data: studioRow } = await supabase
    .from("studios")
    .select("name, subdomain, owner_id")
    .eq("id", thread.studio_id)
    .maybeSingle();
  const studio = studioRow as { name: string; subdomain: string; owner_id: string } | null;
  if (!studio) return;

  const preview = message.content || (message.image_url ? "Sent an image." : "");

  // Prefer the linked project's client_name (matches how the rest of the
  // client portal resolves a display name — client_accounts itself has no
  // name field, only email, see lib/auth/config.ts's ensureClientAccount).
  let clientName: string | null = null;
  if (thread.consultation_id) {
    const { data: consultRow } = await supabase
      .from("consultations")
      .select("client_name")
      .eq("id", thread.consultation_id)
      .maybeSingle();
    clientName = (consultRow as { client_name: string } | null)?.client_name ?? null;
  }
  if (!clientName) {
    const { data: clientAccountRow } = await supabase
      .from("client_accounts")
      .select("email")
      .eq("id", thread.client_account_id)
      .maybeSingle();
    clientName = (clientAccountRow as { email: string } | null)?.email ?? "A client";
  }

  const threadUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://www.inkbook.tech"}/portal/${studio.subdomain}/messages/${threadId}`;
  const ownerThreadUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://www.inkbook.tech"}/owner/messages/${threadId}`;
  const artistThreadUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://www.inkbook.tech"}/artist/messages/${threadId}`;

  if (message.sender_role === "client") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: ownerUserData } = await (supabase as any).auth.admin.getUserById(studio.owner_id);
    const ownerEmail: string | undefined = ownerUserData?.user?.email;
    if (ownerEmail) {
      void sendOwnerNewMessageEmail({
        to: ownerEmail,
        clientName,
        studioName: studio.name,
        preview,
        threadUrl: ownerThreadUrl,
      });
    }

    if (thread.artist_id) {
      const { data: artistRow } = await supabase
        .from("artists")
        .select("name, email")
        .eq("id", thread.artist_id)
        .maybeSingle();
      const artist = artistRow as { name: string; email: string } | null;
      if (artist?.email) {
        void sendArtistNewMessageEmail({
          to: artist.email,
          artistName: artist.name,
          clientName,
          studioName: studio.name,
          preview,
          threadUrl: artistThreadUrl,
        });
      }
    }
  } else {
    const { data: clientAccountRow } = await supabase
      .from("client_accounts")
      .select("email")
      .eq("id", thread.client_account_id)
      .maybeSingle();
    const clientEmail = (clientAccountRow as { email: string } | null)?.email;
    if (clientEmail) {
      void sendClientNewMessageEmail({
        to: clientEmail,
        studioName: studio.name,
        preview,
        threadUrl,
      });
    }
  }
}
