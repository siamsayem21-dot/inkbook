import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/auth/config", () => ({ getStudioId: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendArtistInviteEmail: vi.fn(() => Promise.resolve()) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioId } from "@/lib/auth/config";
import { sendArtistInviteEmail } from "@/lib/email";
import { inviteArtist, cancelInvite, removeArtist } from "@/app/(owner)/owner/artists/actions";

let sb: SupabaseMock;

beforeEach(() => {
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
  vi.mocked(getStudioId).mockResolvedValue("studio-1");
  vi.mocked(sendArtistInviteEmail).mockClear();
});

const INVITE = { name: "Jane Artist", email: "jane@studio.com", studioId: "studio-1" };

describe("inviteArtist — plan limit enforcement", () => {
  it("blocks the invite when a solo-plan studio already has 1 active artist", async () => {
    sb.queueFrom("artists", null); // no duplicate active artist for this email
    sb.queueFrom("artist_invites", null); // no duplicate pending invite for this email
    sb.queueFrom("studios", { name: "Ink & Iron", owner_id: "owner-1", plan: "solo" });
    sb.queueFrom("artists", [{ id: "existing-artist" }]); // isAtArtistLimit: 1 active artist
    sb.queueFrom("artist_invites", []); // isAtArtistLimit: 0 pending invites

    const result = await inviteArtist(INVITE);
    expect(result.error).toMatch(/plan allows up to 1 artist/);
    expect(sendArtistInviteEmail).not.toHaveBeenCalled();
  });

  it("blocks the invite when a studio-plan studio already has all 5 seats used", async () => {
    sb.queueFrom("artists", null);
    sb.queueFrom("artist_invites", null);
    sb.queueFrom("studios", { name: "Ink & Iron", owner_id: "owner-1", plan: "studio" });
    sb.queueFrom("artists", [{ id: "a1" }, { id: "a2" }, { id: "a3" }, { id: "a4" }]); // 4 active
    sb.queueFrom("artist_invites", [{ id: "inv-1" }]); // + 1 pending = 5 used

    const result = await inviteArtist(INVITE);
    expect(result.error).toMatch(/plan allows up to 5 artists/);
  });

  it("allows the invite when under the plan limit", async () => {
    sb.queueFrom("artists", null);
    sb.queueFrom("artist_invites", null);
    sb.queueFrom("studios", { name: "Ink & Iron", owner_id: "owner-1", plan: "studio" });
    sb.queueFrom("artists", [{ id: "a1" }]); // 1 active
    sb.queueFrom("artist_invites", []); // 0 pending
    sb.queueFrom("artist_invites", { token: "tok-123" }); // insert

    const result = await inviteArtist(INVITE);
    expect(result.error).toBeUndefined();
    expect(sendArtistInviteEmail).toHaveBeenCalled();
  });

  it("allows the invite on a pro-plan studio regardless of current artist count", async () => {
    sb.queueFrom("artists", null);
    sb.queueFrom("artist_invites", null);
    sb.queueFrom("studios", { name: "Ink & Iron", owner_id: "owner-1", plan: "pro" });
    sb.queueFrom("artist_invites", { token: "tok-456" }); // insert (isAtArtistLimit short-circuits, no count queries)

    const result = await inviteArtist(INVITE);
    expect(result.error).toBeUndefined();
  });
});

// Full cycle: invite -> cancel/remove -> re-invite. Regression coverage for
// the bug where a removed artist's email could never be re-invited to the
// same studio — inviteArtist()'s duplicate check used to match ANY artists
// row with that email regardless of user_id, so a row left behind by
// removeArtist() (which only nulls user_id, never deletes the row) blocked
// re-inviting forever. See app/artist/accept/[token]/actions.ts's revive
// logic (tests/unit/artist-accept-invite.test.ts) for the other half of the
// fix — re-invite must not create a duplicate artists row either.
describe("inviteArtist — re-invite after removal", () => {
  it("does not block re-inviting an email whose only artists row is removed (user_id NULL)", async () => {
    // The duplicate-check query now filters .not("user_id", "is", null), so a
    // removed artist's row is correctly excluded and the mock queue for this
    // check returns null (no *active* match) — proving the query is scoped
    // this way is asserted below via the chain's recorded `.not()` call.
    sb.queueFrom("artists", null); // duplicate-active-artist check
    sb.queueFrom("artist_invites", null); // no duplicate pending invite
    sb.queueFrom("studios", { name: "Ink & Iron", owner_id: "owner-1", plan: "pro" });
    sb.queueFrom("artist_invites", { token: "tok-re-invite" }); // insert

    const result = await inviteArtist(INVITE);

    expect(result.error).toBeUndefined();
    expect(sendArtistInviteEmail).toHaveBeenCalled();

    const dupCheckChain = sb.getChain("artists", 1);
    expect(dupCheckChain.eq).toHaveBeenCalledWith("email", INVITE.email);
    expect(dupCheckChain.eq).toHaveBeenCalledWith("studio_id", INVITE.studioId);
    expect(dupCheckChain.not).toHaveBeenCalledWith("user_id", "is", null);
  });

  it("still blocks re-inviting an email that has an actively-linked artist", async () => {
    sb.queueFrom("artists", { id: "existing-active-artist" }); // an active artist still owns this email

    const result = await inviteArtist(INVITE);
    expect(result.error).toMatch(/already has an active account/);
    expect(sendArtistInviteEmail).not.toHaveBeenCalled();
  });
});

describe("cancelInvite / removeArtist — studio-scoped mutations", () => {
  beforeEach(() => {
    vi.mocked(getStudioId).mockResolvedValue("studio-1");
  });

  it("cancelInvite deletes only within the caller's studio and only an unaccepted invite", async () => {
    sb.queueFrom("artist_invites", null);

    const result = await cancelInvite("invite-1");

    expect(result.error).toBeUndefined();
    const chain = sb.getChain("artist_invites", 1);
    expect(chain.eq).toHaveBeenCalledWith("id", "invite-1");
    expect(chain.eq).toHaveBeenCalledWith("studio_id", "studio-1");
    expect(chain.is).toHaveBeenCalledWith("accepted_at", null);
  });

  it("removeArtist nulls user_id (not deletes the row), scoped to the caller's studio", async () => {
    sb.queueFrom("artists", null);

    const result = await removeArtist("artist-1");

    expect(result.error).toBeUndefined();
    const chain = sb.getChain("artists", 1);
    expect(chain.update).toHaveBeenCalledWith({ user_id: null });
    expect(chain.eq).toHaveBeenCalledWith("id", "artist-1");
    expect(chain.eq).toHaveBeenCalledWith("studio_id", "studio-1");
  });
});
