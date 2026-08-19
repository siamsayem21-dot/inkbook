import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/auth/config", () => ({ getCurrentUser: vi.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/config";
import { saveAvailability, addUnavailableDate, removeUnavailableDate } from "@/app/(artist)/artist/schedule/actions";

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

describe("addUnavailableDate / removeUnavailableDate — artist ownership check + list management", () => {
  it("addUnavailableDate rejects when the session's artist does not own the given artistId", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-1" } as never);
    sb.queueFrom("artists", null);
    const result = await addUnavailableDate("someone-elses-artist-id", "2099-01-01");
    expect(result.error).toBe("Unauthorized");
  });

  it("addUnavailableDate rejects an invalid date format", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-1" } as never);
    sb.queueFrom("artists", { id: "artist-1" });
    const result = await addUnavailableDate("artist-1", "01/01/2099");
    expect(result.error).toBe("Invalid date");
  });

  it("addUnavailableDate appends and sorts the new date into the existing list", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-1" } as never);
    sb.queueFrom("artists", { id: "artist-1" }); // ownership check
    sb.queueFrom("artists", { unavailable_dates: ["2099-03-01", "2099-01-01"] }); // current list fetch
    sb.queueFrom("artists", { success: true }); // update

    const result = await addUnavailableDate("artist-1", "2099-02-01");
    expect(result.error).toBeUndefined();

    const updateChain = sb.getChain("artists", 3);
    expect(updateChain.update).toHaveBeenCalledWith({
      unavailable_dates: ["2099-01-01", "2099-02-01", "2099-03-01"],
    });
  });

  it("addUnavailableDate is a no-op (not an error, no duplicate) when the date is already marked", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-1" } as never);
    sb.queueFrom("artists", { id: "artist-1" });
    sb.queueFrom("artists", { unavailable_dates: ["2099-01-01"] });

    const result = await addUnavailableDate("artist-1", "2099-01-01");
    expect(result.error).toBeUndefined();
    // No update call should have been made — only 2 "artists" queries (ownership + list fetch)
    expect(sb.fromCalls.filter((t) => t === "artists")).toHaveLength(2);
  });

  it("removeUnavailableDate rejects when the session's artist does not own the given artistId", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-1" } as never);
    sb.queueFrom("artists", null);
    const result = await removeUnavailableDate("someone-elses-artist-id", "2099-01-01");
    expect(result.error).toBe("Unauthorized");
  });

  it("removeUnavailableDate filters the date out of the existing list", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-1" } as never);
    sb.queueFrom("artists", { id: "artist-1" }); // ownership check
    sb.queueFrom("artists", { unavailable_dates: ["2099-01-01", "2099-02-01"] }); // current list fetch
    sb.queueFrom("artists", { success: true }); // update

    const result = await removeUnavailableDate("artist-1", "2099-01-01");
    expect(result.error).toBeUndefined();

    const updateChain = sb.getChain("artists", 3);
    expect(updateChain.update).toHaveBeenCalledWith({ unavailable_dates: ["2099-02-01"] });
  });
});
