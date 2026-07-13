import { describe, it, expect, beforeEach } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";
import { getArtistLimit, isAtArtistLimit } from "@/lib/plan-limits";

let sb: SupabaseMock;

beforeEach(() => {
  sb = createSupabaseMock();
});

describe("getArtistLimit", () => {
  it("returns 1 for solo", () => {
    expect(getArtistLimit("solo")).toBe(1);
  });

  it("returns 5 for studio", () => {
    expect(getArtistLimit("studio")).toBe(5);
  });

  it("returns null (unlimited) for pro", () => {
    expect(getArtistLimit("pro")).toBeNull();
  });

  it("defaults unknown plans to the solo limit", () => {
    expect(getArtistLimit("unknown")).toBe(1);
  });
});

describe("isAtArtistLimit", () => {
  it("is not at limit on solo with 0 active artists and 0 pending invites", async () => {
    sb.queueFrom("artists", []);
    sb.queueFrom("artist_invites", []);
    const result = await isAtArtistLimit(sb.client as never, "studio-1", "solo");
    expect(result).toEqual({ atLimit: false, limit: 1, used: 0 });
  });

  it("is at limit on solo once 1 active artist exists", async () => {
    sb.queueFrom("artists", [{ id: "a1" }]);
    sb.queueFrom("artist_invites", []);
    const result = await isAtArtistLimit(sb.client as never, "studio-1", "solo");
    expect(result).toEqual({ atLimit: true, limit: 1, used: 1 });
  });

  it("counts a pending invite as an occupied seat even with 0 active artists", async () => {
    sb.queueFrom("artists", []);
    sb.queueFrom("artist_invites", [{ id: "inv-1" }]);
    const result = await isAtArtistLimit(sb.client as never, "studio-1", "solo");
    expect(result.atLimit).toBe(true);
    expect(result.used).toBe(1);
  });

  it("is not at limit on studio plan with 4 seats used (cap 5)", async () => {
    sb.queueFrom("artists", [{ id: "a1" }, { id: "a2" }, { id: "a3" }]);
    sb.queueFrom("artist_invites", [{ id: "inv-1" }]);
    const result = await isAtArtistLimit(sb.client as never, "studio-1", "studio");
    expect(result).toEqual({ atLimit: false, limit: 5, used: 4 });
  });

  it("is at limit on studio plan with 5 seats used (cap 5)", async () => {
    sb.queueFrom("artists", [{ id: "a1" }, { id: "a2" }, { id: "a3" }, { id: "a4" }]);
    sb.queueFrom("artist_invites", [{ id: "inv-1" }]);
    const result = await isAtArtistLimit(sb.client as never, "studio-1", "studio");
    expect(result).toEqual({ atLimit: true, limit: 5, used: 5 });
  });

  it("is never at limit on pro (unlimited), skipping the count queries entirely", async () => {
    const result = await isAtArtistLimit(sb.client as never, "studio-1", "pro");
    expect(result).toEqual({ atLimit: false, limit: null, used: 0 });
    expect(sb.fromCalls).toHaveLength(0);
  });

  it("only counts artists still linked to a user (excludes removed artists with user_id = null)", async () => {
    await isAtArtistLimit(sb.client as never, "studio-1", "solo");
    const chain = sb.getChain("artists");
    expect(chain.not).toHaveBeenCalledWith("user_id", "is", null);
  });

  it("only counts non-accepted, non-expired invites", async () => {
    await isAtArtistLimit(sb.client as never, "studio-1", "solo");
    const chain = sb.getChain("artist_invites");
    expect(chain.is).toHaveBeenCalledWith("accepted_at", null);
    expect(chain.gt).toHaveBeenCalledWith("expires_at", expect.any(String));
  });
});
