import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/auth/config", () => ({ getCurrentUser: vi.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/config";
import { saveAvailability } from "@/app/(artist)/artist/schedule/actions";

let sb: SupabaseMock;

const SLOTS = [{ day_of_week: 1, hour: 10 }, { day_of_week: 1, hour: 11 }];

beforeEach(() => {
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
});

describe("saveAvailability — artist ownership check (IDOR fix)", () => {
  it("rejects when there is no authenticated session", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const result = await saveAvailability({ artistId: "artist-1", slots: SLOTS });
    expect(result.error).toBe("Unauthorized");
    expect(sb.fromCalls).not.toContain("artist_availability");
  });

  it("rejects when the session's artist does not own the given artistId", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-1" } as never);
    sb.queueFrom("artists", null); // no artist row for this user_id + artistId combo
    const result = await saveAvailability({ artistId: "someone-elses-artist-id", slots: SLOTS });
    expect(result.error).toBe("Unauthorized");
    expect(sb.fromCalls).not.toContain("artist_availability");
  });

  it("deletes and re-inserts availability once ownership is verified", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-1" } as never);
    sb.queueFrom("artists", { id: "artist-1" });
    sb.queueFrom("artist_availability", { success: true }); // delete
    sb.queueFrom("artist_availability", { success: true }); // insert

    const result = await saveAvailability({ artistId: "artist-1", slots: SLOTS });
    expect(result.error).toBeUndefined();

    const deleteChain = sb.getChain("artist_availability", 1);
    expect(deleteChain.delete).toHaveBeenCalled();
    expect(deleteChain.eq).toHaveBeenCalledWith("artist_id", "artist-1");

    const insertChain = sb.getChain("artist_availability", 2);
    expect(insertChain.insert).toHaveBeenCalledWith([
      { artist_id: "artist-1", day_of_week: 1, hour: 10, is_available: true },
      { artist_id: "artist-1", day_of_week: 1, hour: 11, is_available: true },
    ]);
  });

  it("skips the insert step when slots is empty", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-1" } as never);
    sb.queueFrom("artists", { id: "artist-1" });
    sb.queueFrom("artist_availability", { success: true }); // delete only

    const result = await saveAvailability({ artistId: "artist-1", slots: [] });
    expect(result.error).toBeUndefined();
    expect(sb.fromCalls.filter((t) => t === "artist_availability")).toHaveLength(1);
  });
});
