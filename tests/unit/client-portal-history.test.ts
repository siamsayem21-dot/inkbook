import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/messaging/threads", () => ({ listThreadsForClient: vi.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";
import { listThreadsForClient } from "@/lib/messaging/threads";
import { getClientHistory } from "@/lib/client-portal/history";

let sb: SupabaseMock;

beforeEach(() => {
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
  vi.mocked(listThreadsForClient).mockResolvedValue([]);
});

const BASE_CONSULT = {
  id: "proj-1",
  tattoo_description: "A dragon sleeve",
  detected_style: "Japanese",
  status: "quoted",
  created_at: "2026-07-01T00:00:00Z",
  updated_at: "2026-07-05T00:00:00Z",
  quote_accepted_at: null,
  final_price: null,
  final_sessions: null,
  ai_estimated_sessions: 3,
  ai_estimated_hours: "6-8 hours",
  quote_notes: null,
  booking_id: null,
};

describe("getClientHistory", () => {
  it("returns empty when the client has no submitted ai_chats", async () => {
    sb.queueFrom("ai_chats", []);
    const result = await getClientHistory("studio-1", "acc-1");
    expect(result).toEqual({ projects: [], generalThreads: [] });
    expect(sb.fromCalls).toEqual(["ai_chats"]);
  });

  it("still returns general threads even when there are no projects", async () => {
    sb.queueFrom("ai_chats", []);
    vi.mocked(listThreadsForClient).mockResolvedValue([
      {
        id: "thread-1", studio_id: "studio-1", client_account_id: "acc-1", consultation_id: null, artist_id: null,
        client_last_read_at: null, studio_last_read_at: null, created_at: "", updated_at: "2026-07-02T00:00:00Z",
        unread: false, lastMessage: { id: "m1", thread_id: "thread-1", sender_role: "owner", sender_client_account_id: null, sender_artist_id: null, content: "Hi there", image_url: null, created_at: "2026-07-02T00:00:00Z" },
      },
    ]);

    const result = await getClientHistory("studio-1", "acc-1");

    expect(result.projects).toEqual([]);
    expect(result.generalThreads).toEqual([
      { id: "thread-1", lastMessagePreview: "Hi there", lastMessageAt: "2026-07-02T00:00:00Z" },
    ]);
  });

  it("includes only 'Consultation Submitted' when no quote exists yet", async () => {
    sb.queueFrom("ai_chats", [{ id: "chat-1", consultation_id: "proj-1" }]);
    sb.queueFrom("consultations", [{ ...BASE_CONSULT, status: "new" }]);
    // no bookingIds -> bookings/consent_forms not queried
    sb.queueFrom("ai_chat_messages", []);

    const result = await getClientHistory("studio-1", "acc-1");

    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].timeline.map((t) => t.key)).toEqual(["submitted"]);
    expect(sb.fromCalls).not.toContain("bookings");
    expect(sb.fromCalls).not.toContain("consent_forms");
  });

  it("adds Quote Ready and Quote Accepted when a quote exists and was accepted", async () => {
    sb.queueFrom("ai_chats", [{ id: "chat-1", consultation_id: "proj-1" }]);
    sb.queueFrom("consultations", [
      { ...BASE_CONSULT, final_price: 800, quote_accepted_at: "2026-07-06T00:00:00Z" },
    ]);
    sb.queueFrom("ai_chat_messages", []);

    const result = await getClientHistory("studio-1", "acc-1");

    const keys = result.projects[0].timeline.map((t) => t.key);
    expect(keys).toEqual(["submitted", "quote_ready", "quote_accepted"]);
    expect(result.projects[0].timeline[1].approximate).toBe(true); // quote_ready uses updated_at
  });

  it("adds Deposit Paid and Consent Form Signed when a booking + consent form exist", async () => {
    sb.queueFrom("ai_chats", [{ id: "chat-1", consultation_id: "proj-1" }]);
    sb.queueFrom("consultations", [{ ...BASE_CONSULT, final_price: 800, booking_id: "bk-1" }]);
    sb.queueFrom("bookings", [{ id: "bk-1", status: "confirmed", deposit_paid_at: "2026-07-07T00:00:00Z" }]);
    sb.queueFrom("consent_forms", [{ booking_id: "bk-1", signed_at: "2026-07-08T00:00:00Z" }]);
    sb.queueFrom("ai_chat_messages", []);

    const result = await getClientHistory("studio-1", "acc-1");

    const keys = result.projects[0].timeline.map((t) => t.key);
    expect(keys).toContain("deposit_paid");
    expect(keys).toContain("consent_signed");
    expect(result.projects[0].booking).toEqual({ id: "bk-1", status: "confirmed" });
  });

  it("omits Consent Form Signed when no consent_forms row exists for the booking", async () => {
    sb.queueFrom("ai_chats", [{ id: "chat-1", consultation_id: "proj-1" }]);
    sb.queueFrom("consultations", [{ ...BASE_CONSULT, final_price: 800, booking_id: "bk-1" }]);
    sb.queueFrom("bookings", [{ id: "bk-1", status: "pending_deposit", deposit_paid_at: null }]);
    sb.queueFrom("consent_forms", []);
    sb.queueFrom("ai_chat_messages", []);

    const result = await getClientHistory("studio-1", "acc-1");

    const keys = result.projects[0].timeline.map((t) => t.key);
    expect(keys).not.toContain("consent_signed");
    expect(keys).not.toContain("deposit_paid");
  });

  it("adds an approximate Declined entry when status is 'lost'", async () => {
    sb.queueFrom("ai_chats", [{ id: "chat-1", consultation_id: "proj-1" }]);
    sb.queueFrom("consultations", [{ ...BASE_CONSULT, status: "lost" }]);
    sb.queueFrom("ai_chat_messages", []);

    const result = await getClientHistory("studio-1", "acc-1");

    const declined = result.projects[0].timeline.find((t) => t.key === "declined");
    expect(declined).toBeDefined();
    expect(declined?.approximate).toBe(true);
  });

  it("attaches the project-scoped thread and AI transcript, keyed correctly by chat id", async () => {
    sb.queueFrom("ai_chats", [{ id: "chat-1", consultation_id: "proj-1" }]);
    sb.queueFrom("consultations", [{ ...BASE_CONSULT }]);
    vi.mocked(listThreadsForClient).mockResolvedValue([
      {
        id: "thread-9", studio_id: "studio-1", client_account_id: "acc-1", consultation_id: "proj-1", artist_id: null,
        client_last_read_at: null, studio_last_read_at: null, created_at: "", updated_at: "",
        unread: false, lastMessage: { id: "m1", thread_id: "thread-9", sender_role: "client", sender_client_account_id: "acc-1", sender_artist_id: null, content: "Question?", image_url: null, created_at: "2026-07-03T00:00:00Z" },
      },
    ]);
    sb.queueFrom("ai_chat_messages", [
      { chat_id: "chat-1", role: "user", content: "I want a dragon", image_url: null, created_at: "2026-07-01T00:01:00Z" },
      { chat_id: "chat-1", role: "assistant", content: "Great choice!", image_url: null, created_at: "2026-07-01T00:02:00Z" },
    ]);

    const result = await getClientHistory("studio-1", "acc-1");

    expect(result.projects[0].thread).toEqual({ id: "thread-9", lastMessagePreview: "Question?", lastMessageAt: "2026-07-03T00:00:00Z" });
    expect(result.projects[0].transcript).toHaveLength(2);
    expect(result.projects[0].transcript[0]).toMatchObject({ role: "user", content: "I want a dragon" });
  });

  it("sorts projects by updatedAt descending", async () => {
    sb.queueFrom("ai_chats", [
      { id: "chat-1", consultation_id: "proj-old" },
      { id: "chat-2", consultation_id: "proj-new" },
    ]);
    sb.queueFrom("consultations", [
      { ...BASE_CONSULT, id: "proj-old", updated_at: "2026-01-01T00:00:00Z" },
      { ...BASE_CONSULT, id: "proj-new", updated_at: "2026-07-01T00:00:00Z" },
    ]);
    sb.queueFrom("ai_chat_messages", []);

    const result = await getClientHistory("studio-1", "acc-1");

    expect(result.projects.map((p) => p.id)).toEqual(["proj-new", "proj-old"]);
  });
});
