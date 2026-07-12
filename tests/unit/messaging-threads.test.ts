import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/email", () => ({
  sendOwnerNewMessageEmail: vi.fn(),
  sendArtistNewMessageEmail: vi.fn(),
  sendClientNewMessageEmail: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateThread, postMessage } from "@/lib/messaging/threads";

let sb: SupabaseMock;

beforeEach(() => {
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
});

describe("getOrCreateThread", () => {
  const params = { studioId: "studio-1", clientAccountId: "client-1", consultationId: "proj-1", artistId: "artist-1" };

  it("returns the existing thread without inserting when one is already found", async () => {
    const existing = { id: "thread-1", studio_id: "studio-1", client_account_id: "client-1", consultation_id: "proj-1" };
    sb.queueFrom("message_threads", existing);

    const result = await getOrCreateThread(params);

    expect(result.thread).toEqual(existing);
    expect(sb.fromCalls.filter((t) => t === "message_threads")).toHaveLength(1);
  });

  it("creates a new thread when none exists", async () => {
    const inserted = { id: "thread-2", studio_id: "studio-1", client_account_id: "client-1", consultation_id: "proj-1" };
    sb.queueFrom("message_threads", null); // initial find — none
    sb.queueFrom("message_threads", inserted); // insert().select().single()

    const result = await getOrCreateThread(params);

    expect(result.thread).toEqual(inserted);
    expect(sb.getChain("message_threads", 2).insert).toHaveBeenCalledWith(
      expect.objectContaining({ studio_id: "studio-1", client_account_id: "client-1", consultation_id: "proj-1" })
    );
  });

  it("falls back to re-selecting on a concurrent-insert race instead of erroring", async () => {
    const raceWinner = { id: "thread-3", studio_id: "studio-1", client_account_id: "client-1", consultation_id: "proj-1" };
    sb.queueFrom("message_threads", null); // initial find — none
    sb.queueFrom("message_threads", null, { code: "23505", message: "duplicate key value" }); // insert fails
    sb.queueFrom("message_threads", raceWinner); // re-select finds the concurrent insert

    const result = await getOrCreateThread(params);

    expect(result.error).toBeUndefined();
    expect(result.thread).toEqual(raceWinner);
  });

  it("returns a friendly error when insert fails and no row is found on retry", async () => {
    sb.queueFrom("message_threads", null);
    sb.queueFrom("message_threads", null, { message: "db unavailable" });
    sb.queueFrom("message_threads", null);

    const result = await getOrCreateThread(params);

    expect(result.thread).toBeUndefined();
    expect(result.error).toBeTruthy();
  });
});

describe("postMessage", () => {
  it("rejects an empty message with no image", async () => {
    const result = await postMessage({ threadId: "thread-1", senderRole: "client", content: "   " });
    expect(result.error).toBeTruthy();
    expect(sb.fromCalls).toHaveLength(0);
  });

  it("inserts the message and bumps the thread's updated_at on success", async () => {
    const inserted = { id: "msg-1", thread_id: "thread-1", sender_role: "client", content: "Hi", image_url: null };
    sb.queueFrom("messages", inserted); // insert().select().single()
    sb.queueFrom("message_threads", { success: true }); // updated_at bump
    sb.queueFrom("message_threads", null); // notifyNewMessage's own thread lookup — exits early

    const result = await postMessage({ threadId: "thread-1", senderRole: "client", senderClientAccountId: "client-1", content: "Hi" });

    expect(result.message).toEqual(inserted);
    expect(sb.getChain("message_threads", 1).update).toHaveBeenCalledWith(
      expect.objectContaining({ updated_at: expect.any(String) })
    );
  });
});
