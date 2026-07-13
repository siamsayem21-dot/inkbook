import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/auth/config", () => ({ getStudioId: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendArtistInviteEmail: vi.fn(() => Promise.resolve()) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioId } from "@/lib/auth/config";
import { sendArtistInviteEmail } from "@/lib/email";
import { inviteArtist } from "@/app/(owner)/owner/artists/actions";

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
