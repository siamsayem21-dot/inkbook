import { createAdminClient } from "@/lib/supabase/admin";
import { toClientQuote, type QuoteSourceRow } from "./quote";
import { listThreadsForClient } from "@/lib/messaging/threads";

export type HistoryTimelineEntry = {
  key: string;
  label: string;
  date: string; // ISO
  // True for entries backed only by consultations.updated_at (a general
  // last-modified column, not a dedicated per-event timestamp) — see
  // lib/client-portal/quote.ts's own TODO(schema) comment for the same
  // tradeoff already accepted elsewhere in this codebase.
  approximate?: boolean;
};

export type ThreadSummaryLite = {
  id: string;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
};

export type ClientHistoryProject = {
  id: string; // consultation id
  title: string;
  status: string;
  updatedAt: string;
  timeline: HistoryTimelineEntry[];
  booking: { id: string; status: string } | null;
  thread: ThreadSummaryLite | null;
  transcript: { role: "user" | "assistant"; content: string; imageUrl: string | null; createdAt: string }[];
};

export type ClientHistory = {
  projects: ClientHistoryProject[];
  generalThreads: ThreadSummaryLite[];
};

type ConsultRow = QuoteSourceRow & {
  id: string;
  tattoo_description: string;
  detected_style: string | null;
  status: string;
  created_at: string;
  booking_id: string | null;
};

function deriveTitle(description: string, style: string | null): string {
  const base = (style ? `${style} Tattoo` : description) || "Tattoo Project";
  return base.length > 50 ? `${base.slice(0, 47).trimEnd()}…` : base;
}

function toThreadSummaryLite(t: { id: string; lastMessage: { content: string; image_url: string | null; created_at: string } | null }): ThreadSummaryLite {
  return {
    id: t.id,
    lastMessagePreview: t.lastMessage ? t.lastMessage.content || (t.lastMessage.image_url ? "Sent an image" : null) : null,
    lastMessageAt: t.lastMessage?.created_at ?? null,
  };
}

// Read-only aggregation across every existing client-portal data source
// (consultations, bookings, consent_forms, message_threads/messages,
// ai_chats/ai_chat_messages) via the same ai_chats -> consultations
// ownership chain already used by lib/client-portal/projects.ts and
// bookings.ts. No new tables, no new columns, no writes — see the "History"
// plan's Context for why some timeline entries are only approximately dated.
export async function getClientHistory(studioId: string, clientAccountId: string): Promise<ClientHistory> {
  const supabase = createAdminClient();

  const { data: chatRows } = await supabase
    .from("ai_chats")
    .select("id, consultation_id")
    .eq("studio_id", studioId)
    .eq("client_account_id", clientAccountId)
    .eq("status", "submitted")
    .not("consultation_id", "is", null);

  const chats = ((chatRows ?? []) as { id: string; consultation_id: string | null }[]).filter(
    (r): r is { id: string; consultation_id: string } => Boolean(r.consultation_id)
  );

  const threads = await listThreadsForClient(studioId, clientAccountId);
  const generalThreads = threads.filter((t) => !t.consultation_id).map(toThreadSummaryLite);
  const threadByConsultationId = new Map(
    threads.filter((t): t is typeof t & { consultation_id: string } => Boolean(t.consultation_id)).map((t) => [t.consultation_id, t])
  );

  if (chats.length === 0) return { projects: [], generalThreads };

  const consultationIds = Array.from(new Set(chats.map((c) => c.consultation_id)));
  const { data: consultRows } = await supabase
    .from("consultations")
    .select(
      "id, tattoo_description, detected_style, status, created_at, updated_at, quote_accepted_at, " +
        "final_price, final_sessions, ai_estimated_sessions, ai_estimated_hours, quote_notes, booking_id"
    )
    .in("id", consultationIds);
  const consultations = (consultRows ?? []) as ConsultRow[];

  const bookingIds = consultations.map((c) => c.booking_id).filter((id): id is string => Boolean(id));

  const { data: bookingRows } = bookingIds.length
    ? await supabase.from("bookings").select("id, status, deposit_paid_at").in("id", bookingIds)
    : { data: [] as { id: string; status: string; deposit_paid_at: string | null }[] };
  const bookingById = new Map(
    (bookingRows ?? []).map((b) => [b.id, b as { id: string; status: string; deposit_paid_at: string | null }])
  );

  const { data: consentRows } = bookingIds.length
    ? await supabase.from("consent_forms").select("booking_id, signed_at").in("booking_id", bookingIds)
    : { data: [] as { booking_id: string; signed_at: string }[] };
  const consentSignedAtByBookingId = new Map((consentRows ?? []).map((c) => [c.booking_id, c.signed_at]));

  const chatByConsultationId = new Map(chats.map((c) => [c.consultation_id, c.id]));
  const chatIds = chats.map((c) => c.id);

  const { data: transcriptRows } = chatIds.length
    ? await supabase
        .from("ai_chat_messages")
        .select("chat_id, role, content, image_url, created_at")
        .in("chat_id", chatIds)
        .order("created_at", { ascending: true })
    : { data: [] as { chat_id: string; role: string; content: string; image_url: string | null; created_at: string }[] };

  const transcriptByChatId = new Map<
    string,
    { role: string; content: string; image_url: string | null; created_at: string }[]
  >();
  for (const row of (transcriptRows ?? []) as { chat_id: string; role: string; content: string; image_url: string | null; created_at: string }[]) {
    const list = transcriptByChatId.get(row.chat_id) ?? [];
    list.push(row);
    transcriptByChatId.set(row.chat_id, list);
  }

  const projects: ClientHistoryProject[] = consultations.map((c) => {
    const timeline: HistoryTimelineEntry[] = [{ key: "submitted", label: "Consultation Submitted", date: c.created_at }];

    // "A quote exists" is best proven by final_price !== null (set once by
    // saveConsultationQuote() and never cleared) — not by status === "quoted",
    // which is only true for a narrow window before the project progresses
    // further (see the Project Detail page's own narrower use of that gate).
    if (c.final_price !== null) {
      const quote = toClientQuote(c);
      timeline.push({ key: "quote_ready", label: "Quote Ready", date: quote.quoteCreatedAt, approximate: true });
      if (quote.acceptedAt) {
        timeline.push({ key: "quote_accepted", label: "Quote Accepted", date: quote.acceptedAt });
      }
    }

    const booking = c.booking_id ? bookingById.get(c.booking_id) ?? null : null;
    if (booking?.deposit_paid_at) {
      timeline.push({ key: "deposit_paid", label: "Deposit Paid", date: booking.deposit_paid_at });
    }

    const consentSignedAt = c.booking_id ? consentSignedAtByBookingId.get(c.booking_id) : undefined;
    if (consentSignedAt) {
      timeline.push({ key: "consent_signed", label: "Consent Form Signed", date: consentSignedAt });
    }

    if (c.status === "lost") {
      timeline.push({ key: "declined", label: "Declined", date: c.updated_at, approximate: true });
    }

    timeline.sort((a, b) => a.date.localeCompare(b.date));

    const chatId = chatByConsultationId.get(c.id);
    const transcript = (chatId ? transcriptByChatId.get(chatId) ?? [] : []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
      imageUrl: m.image_url,
      createdAt: m.created_at,
    }));

    return {
      id: c.id,
      title: deriveTitle(c.tattoo_description, c.detected_style),
      status: c.status,
      updatedAt: c.updated_at,
      timeline,
      booking: booking ? { id: booking.id, status: booking.status } : null,
      thread: threadByConsultationId.has(c.id) ? toThreadSummaryLite(threadByConsultationId.get(c.id)!) : null,
      transcript,
    };
  });

  projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return { projects, generalThreads };
}
