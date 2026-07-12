import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/auth/config", () => ({
  ensureClientAccount: vi.fn(),
  getStudioId: vi.fn(),
  getCurrentUser: vi.fn(),
}));
vi.mock("@/lib/messaging/threads", () => ({
  getThreadIfOwned: vi.fn(),
  postMessage: vi.fn(),
  getOrCreateThread: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { ensureClientAccount, getStudioId, getCurrentUser } from "@/lib/auth/config";
import { getThreadIfOwned, postMessage, getOrCreateThread } from "@/lib/messaging/threads";
import { sendClientMessage, startGeneralThread } from "@/app/portal/[studio]/messages/actions";
import { sendOwnerMessage } from "@/app/(owner)/owner/messages/actions";
import { sendArtistMessage } from "@/app/(artist)/artist/messages/actions";

let sb: SupabaseMock;

function fd(content: string) {
  const f = new FormData();
  f.append("content", content);
  return f;
}

beforeEach(() => {
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
  vi.mocked(getThreadIfOwned).mockReset();
  vi.mocked(postMessage).mockReset();
  vi.mocked(getOrCreateThread).mockReset();
});

describe("sendClientMessage", () => {
  it("errors when not signed in", async () => {
    vi.mocked(ensureClientAccount).mockResolvedValue(null);
    const result = await sendClientMessage("thread-1", fd("hi"));
    expect(result.error).toBe("Not signed in.");
    expect(getThreadIfOwned).not.toHaveBeenCalled();
  });

  it("errors when the thread isn't owned by this client", async () => {
    vi.mocked(ensureClientAccount).mockResolvedValue({ id: "acc-1", email: "a@b.com" });
    vi.mocked(getThreadIfOwned).mockResolvedValue(null);
    const result = await sendClientMessage("thread-1", fd("hi"));
    expect(result.error).toBe("Conversation not found.");
    expect(postMessage).not.toHaveBeenCalled();
  });

  it("errors on an empty message with no image", async () => {
    vi.mocked(ensureClientAccount).mockResolvedValue({ id: "acc-1", email: "a@b.com" });
    vi.mocked(getThreadIfOwned).mockResolvedValue({
      id: "thread-1", studio_id: "studio-1", client_account_id: "acc-1",
      consultation_id: null, artist_id: null, client_last_read_at: null, studio_last_read_at: null,
      created_at: "", updated_at: "",
    });
    const result = await sendClientMessage("thread-1", fd("   "));
    expect(result.error).toBeTruthy();
    expect(postMessage).not.toHaveBeenCalled();
  });

  it("posts with sender_role client on success", async () => {
    vi.mocked(ensureClientAccount).mockResolvedValue({ id: "acc-1", email: "a@b.com" });
    vi.mocked(getThreadIfOwned).mockResolvedValue({
      id: "thread-1", studio_id: "studio-1", client_account_id: "acc-1",
      consultation_id: null, artist_id: null, client_last_read_at: null, studio_last_read_at: null,
      created_at: "", updated_at: "",
    });
    vi.mocked(postMessage).mockResolvedValue({ message: { id: "msg-1" } as never });

    const result = await sendClientMessage("thread-1", fd("Hello studio"));

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ threadId: "thread-1", senderRole: "client", senderClientAccountId: "acc-1", content: "Hello studio" })
    );
    expect(result.message).toEqual({ id: "msg-1" });
  });
});

describe("startGeneralThread", () => {
  it("errors when not signed in", async () => {
    vi.mocked(ensureClientAccount).mockResolvedValue(null);
    const result = await startGeneralThread("studio-1");
    expect(result.error).toBe("Not signed in.");
    expect(getOrCreateThread).not.toHaveBeenCalled();
  });

  it("creates/finds the general thread and returns its id", async () => {
    vi.mocked(ensureClientAccount).mockResolvedValue({ id: "acc-1", email: "a@b.com" });
    vi.mocked(getOrCreateThread).mockResolvedValue({ thread: { id: "thread-9" } as never });

    const result = await startGeneralThread("studio-1");

    expect(getOrCreateThread).toHaveBeenCalledWith({ studioId: "studio-1", clientAccountId: "acc-1", consultationId: null });
    expect(result.threadId).toBe("thread-9");
  });
});

describe("sendOwnerMessage", () => {
  it("errors when unauthorized", async () => {
    vi.mocked(getStudioId).mockResolvedValue(null);
    const result = await sendOwnerMessage("thread-1", fd("hi"));
    expect(result.error).toBe("Unauthorized");
    expect(getThreadIfOwned).not.toHaveBeenCalled();
  });

  it("errors when the thread isn't owned by this studio", async () => {
    vi.mocked(getStudioId).mockResolvedValue("studio-1");
    vi.mocked(getThreadIfOwned).mockResolvedValue(null);
    const result = await sendOwnerMessage("thread-1", fd("hi"));
    expect(result.error).toBe("Conversation not found.");
  });

  it("posts with sender_role owner on success", async () => {
    vi.mocked(getStudioId).mockResolvedValue("studio-1");
    vi.mocked(getThreadIfOwned).mockResolvedValue({
      id: "thread-1", studio_id: "studio-1", client_account_id: "acc-1",
      consultation_id: null, artist_id: null, client_last_read_at: null, studio_last_read_at: null,
      created_at: "", updated_at: "",
    });
    vi.mocked(postMessage).mockResolvedValue({ message: { id: "msg-2" } as never });

    const result = await sendOwnerMessage("thread-1", fd("Reply from owner"));

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ threadId: "thread-1", senderRole: "owner", content: "Reply from owner" })
    );
    expect(result.message).toEqual({ id: "msg-2" });
  });
});

describe("sendArtistMessage", () => {
  it("errors when unauthenticated", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const result = await sendArtistMessage("thread-1", fd("hi"));
    expect(result.error).toBe("Unauthorized");
    expect(getThreadIfOwned).not.toHaveBeenCalled();
  });

  it("errors when the signed-in user has no artist row", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-1" } as never);
    sb.queueFrom("artists", null); // resolveArtistId lookup — no match
    const result = await sendArtistMessage("thread-1", fd("hi"));
    expect(result.error).toBe("Unauthorized");
  });

  it("errors when the thread isn't assigned to this artist", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-1" } as never);
    sb.queueFrom("artists", { id: "artist-1" });
    vi.mocked(getThreadIfOwned).mockResolvedValue(null);
    const result = await sendArtistMessage("thread-1", fd("hi"));
    expect(result.error).toBe("Conversation not found.");
  });

  it("posts with sender_role artist on success", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-1" } as never);
    sb.queueFrom("artists", { id: "artist-1" });
    vi.mocked(getThreadIfOwned).mockResolvedValue({
      id: "thread-1", studio_id: "studio-1", client_account_id: "acc-1",
      consultation_id: null, artist_id: "artist-1", client_last_read_at: null, studio_last_read_at: null,
      created_at: "", updated_at: "",
    });
    vi.mocked(postMessage).mockResolvedValue({ message: { id: "msg-3" } as never });

    const result = await sendArtistMessage("thread-1", fd("Reply from artist"));

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ threadId: "thread-1", senderRole: "artist", senderArtistId: "artist-1", content: "Reply from artist" })
    );
    expect(result.message).toEqual({ id: "msg-3" });
  });
});
