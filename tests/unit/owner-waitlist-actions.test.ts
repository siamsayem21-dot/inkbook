import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/auth/config", () => ({ getStudioId: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioId } from "@/lib/auth/config";
import { getWaitlistData, updateMonthlyCap, removeFromWaitlist } from "@/app/(owner)/owner/waitlist/actions";

let sb: SupabaseMock;

beforeEach(() => {
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
  vi.mocked(getStudioId).mockResolvedValue("studio-1");
});

describe("getWaitlistData", () => {
  it("returns empty when not signed in", async () => {
    vi.mocked(getStudioId).mockResolvedValue(null);
    expect(await getWaitlistData()).toEqual({ artists: [], entries: [] });
  });

  it("assembles per-artist cap rows and waitlist entries with resolved names", async () => {
    sb.queueFrom("artists", [{ id: "art-1", name: "Artist X", monthly_booking_cap: 20 }]);
    sb.queueFrom("bookings", [{ id: "bk-1" }, { id: "bk-2" }]); // bookings this month for art-1
    sb.queueFrom("waitlist", [{ id: "wl-1", artist_id: "art-1", client_id: "c1", preferred_style: "Traditional", notes: null, notified: false, added_at: "2026-01-01" }]);
    sb.queueFrom("clients", [{ id: "c1", full_name: "Jane Client" }]);

    const { artists, entries } = await getWaitlistData();
    expect(artists).toEqual([{ id: "art-1", name: "Artist X", monthlyBookingCap: 20, bookingsThisMonth: 2 }]);
    expect(entries).toEqual([
      { id: "wl-1", clientName: "Jane Client", artistName: "Artist X", preferredStyle: "Traditional", notes: null, notified: false, addedAt: "2026-01-01" },
    ]);
  });
});

describe("updateMonthlyCap", () => {
  it("errors when not signed in", async () => {
    vi.mocked(getStudioId).mockResolvedValue(null);
    const result = await updateMonthlyCap("art-1", 10);
    expect(result.error).toBe("Unauthorized");
  });

  it("rejects a non-positive cap", async () => {
    const result = await updateMonthlyCap("art-1", 0);
    expect(result.error).toMatch(/positive/);
  });

  it("rejects a non-integer cap", async () => {
    const result = await updateMonthlyCap("art-1", 5.5);
    expect(result.error).toMatch(/positive/);
  });

  it("updates the cap scoped to the caller's studio", async () => {
    sb.queueFrom("artists", { success: true });
    const result = await updateMonthlyCap("art-1", 15);
    expect(result.error).toBeUndefined();
    const chain = sb.getChain("artists");
    expect((chain as { update: { mock: { calls: unknown[][] } } }).update.mock.calls[0][0]).toEqual({ monthly_booking_cap: 15 });
    expect(chain.eq).toHaveBeenCalledWith("studio_id", "studio-1");
  });
});

describe("removeFromWaitlist", () => {
  it("errors when not signed in", async () => {
    vi.mocked(getStudioId).mockResolvedValue(null);
    const result = await removeFromWaitlist("wl-1");
    expect(result.error).toBe("Unauthorized");
  });

  it("deletes scoped to the caller's studio", async () => {
    sb.queueFrom("waitlist", { success: true });
    const result = await removeFromWaitlist("wl-1");
    expect(result.error).toBeUndefined();
    expect(sb.getChain("waitlist").eq).toHaveBeenCalledWith("studio_id", "studio-1");
  });
});
