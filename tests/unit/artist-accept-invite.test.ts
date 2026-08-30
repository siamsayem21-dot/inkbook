import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

// app/artist/accept/[token]/actions.ts builds its own admin client via
// @supabase/supabase-js's createClient directly (not the shared
// lib/supabase/admin wrapper), so it's mocked here the same way
// tests/unit/api-studios.test.ts mocks it — a thin shim over the reusable
// createSupabaseMock() FIFO-per-table queue, plus the two auth.admin methods
// this file actually calls.
let sb: SupabaseMock;
const createUser = vi.fn();
const deleteUser = vi.fn(() => Promise.resolve({ data: {}, error: null }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: (table: string) => sb.client.from(table),
    auth: { admin: { createUser, deleteUser } },
  })),
}));

import { acceptInvite } from "@/app/artist/accept/[token]/actions";

const INVITE_ROW = {
  id: "invite-1",
  studio_id: "studio-1",
  invited_email: "jane@studio.com",
  accepted_at: null,
  expires_at: new Date(Date.now() + 60_000).toISOString(),
};

beforeEach(() => {
  sb = createSupabaseMock();
  createUser.mockReset();
  deleteUser.mockClear();
});

describe("acceptInvite — revive a removed artist instead of duplicating on re-invite", () => {
  it("creates a new artist row when no removed row exists for this email in this studio", async () => {
    createUser.mockResolvedValue({ data: { user: { id: "new-user-1" } }, error: null });

    sb.queueFrom("artist_invites", INVITE_ROW); // token lookup
    sb.queueFrom("artists", null); // revive check: nothing found
    sb.queueFrom("artists", { id: "new-artist-1" }); // insert
    sb.queueFrom("artist_invites", null); // mark accepted

    const result = await acceptInvite({ token: "tok", name: "Jane Artist", password: "password123" });

    expect(result.error).toBeUndefined();
    const artistsChain2 = sb.getChain("artists", 2);
    expect(artistsChain2.insert).toHaveBeenCalledWith(
      expect.objectContaining({ studio_id: "studio-1", user_id: "new-user-1", email: "jane@studio.com" })
    );
    expect(artistsChain2.update).not.toHaveBeenCalled();
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("revives the existing removed artist row instead of inserting a duplicate", async () => {
    createUser.mockResolvedValue({ data: { user: { id: "new-user-2" } }, error: null });

    sb.queueFrom("artist_invites", INVITE_ROW);
    sb.queueFrom("artists", { id: "removed-artist-1" }); // revive check: found a removed row
    sb.queueFrom("artists", { id: "removed-artist-1" }); // update result
    sb.queueFrom("artist_invites", null);

    const result = await acceptInvite({ token: "tok", name: "Jane Artist", password: "password123" });

    expect(result.error).toBeUndefined();

    const revivedCheckChain = sb.getChain("artists", 1);
    expect(revivedCheckChain.eq).toHaveBeenCalledWith("studio_id", "studio-1");
    expect(revivedCheckChain.eq).toHaveBeenCalledWith("email", "jane@studio.com");
    expect(revivedCheckChain.is).toHaveBeenCalledWith("user_id", null);

    const reviveChain = sb.getChain("artists", 2);
    expect(reviveChain.update).toHaveBeenCalledWith({ user_id: "new-user-2", name: "Jane Artist", is_active: true });
    expect(reviveChain.eq).toHaveBeenCalledWith("id", "removed-artist-1");
    expect(reviveChain.insert).not.toHaveBeenCalled();

    // The revived id (not a fresh one) is what gets linked onto the invite row.
    const inviteUpdateChain = sb.getChain("artist_invites", 2);
    expect(inviteUpdateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ artist_id: "removed-artist-1" })
    );
  });

  it("scopes the revive check to studio_id + email together — never matches a different studio's removed artist", async () => {
    createUser.mockResolvedValue({ data: { user: { id: "new-user-3" } }, error: null });

    // This invite is for studio-2. A removed artist with the same email might
    // exist at studio-1 (a different studio) in the real DB, but the revive
    // query is scoped to studio_id = inv.studio_id ("studio-2"), so it must
    // find nothing here — proving studio-1's row can never be picked up.
    sb.queueFrom("artist_invites", { ...INVITE_ROW, studio_id: "studio-2" });
    sb.queueFrom("artists", null); // scoped query correctly finds nothing for studio-2
    sb.queueFrom("artists", { id: "new-artist-2" }); // falls through to a normal insert
    sb.queueFrom("artist_invites", null);

    const result = await acceptInvite({ token: "tok", name: "Jane Artist", password: "password123" });

    expect(result.error).toBeUndefined();

    const revivedCheckChain = sb.getChain("artists", 1);
    expect(revivedCheckChain.eq).toHaveBeenCalledWith("studio_id", "studio-2");
    expect(revivedCheckChain.eq).toHaveBeenCalledWith("email", "jane@studio.com");
    expect(revivedCheckChain.is).toHaveBeenCalledWith("user_id", null);

    // Never falls back to "update whatever we can find" — with nothing
    // matched inside studio-2, a fresh row is inserted, never an update
    // against some other studio's artist.
    const secondArtistsChain = sb.getChain("artists", 2);
    expect(secondArtistsChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ studio_id: "studio-2", user_id: "new-user-3" })
    );
    expect(secondArtistsChain.update).not.toHaveBeenCalled();
  });
});

// Regression coverage for the "stuck on Setting up your account..." P1 bug
// (2026-08-30, reported live by Siam). Root cause: this file had no
// try/catch anywhere — any unexpected exception rejected the whole server
// action instead of resolving with the normal { error } shape the client
// already knows how to display, leaving the client's loading state stuck
// forever (see AcceptForm.tsx's matching client-side fix). This proves the
// server half: acceptInvite() must never reject, no matter what throws
// inside it.
describe("acceptInvite — never rejects, even on an unexpected internal error", () => {
  it("catches an exception thrown mid-flow and returns a normal { error } response instead of rejecting", async () => {
    createUser.mockImplementation(() => {
      throw new Error("simulated unexpected failure (e.g. a transient network/infra issue)");
    });

    sb.queueFrom("artist_invites", INVITE_ROW); // token lookup succeeds

    await expect(
      acceptInvite({ token: "tok", name: "Jane Artist", password: "password123" })
    ).resolves.toEqual({ error: "Something went wrong setting up your account. Please try again." });
  });
});
