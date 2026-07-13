import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";
import { getArtistBookingCountForMonth, isAtMonthlyCap } from "@/lib/waitlist";

let sb: SupabaseMock;

beforeEach(() => {
  sb = createSupabaseMock();
});

describe("getArtistBookingCountForMonth", () => {
  it("returns the number of matching rows", async () => {
    sb.queueFrom("bookings", [{ id: "bk-1" }, { id: "bk-2" }, { id: "bk-3" }]);
    const count = await getArtistBookingCountForMonth(sb.client as never, "artist-1", "2026-09-15");
    expect(count).toBe(3);
  });

  it("returns 0 when there are no rows", async () => {
    sb.queueFrom("bookings", []);
    const count = await getArtistBookingCountForMonth(sb.client as never, "artist-1", "2026-09-15");
    expect(count).toBe(0);
  });

  it("scopes the query to the calendar month boundaries of the given date (leap-year February)", async () => {
    sb.queueFrom("bookings", []);
    await getArtistBookingCountForMonth(sb.client as never, "artist-1", "2028-02-10");
    const chain = sb.getChain("bookings");
    expect(chain.gte).toHaveBeenCalledWith("date", "2028-02-01");
    expect(chain.lte).toHaveBeenCalledWith("date", "2028-02-29"); // 2028 is a leap year
  });
});

describe("isAtMonthlyCap", () => {
  it("returns true when count meets the cap", async () => {
    sb.queueFrom("bookings", [{ id: "bk-1" }, { id: "bk-2" }]);
    const atCap = await isAtMonthlyCap(sb.client as never, "artist-1", 2, "2026-09-15");
    expect(atCap).toBe(true);
  });

  it("returns false when count is below the cap", async () => {
    sb.queueFrom("bookings", [{ id: "bk-1" }]);
    const atCap = await isAtMonthlyCap(sb.client as never, "artist-1", 2, "2026-09-15");
    expect(atCap).toBe(false);
  });
});
