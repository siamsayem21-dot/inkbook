import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/auth/config", () => ({ getStudioId: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioId } from "@/lib/auth/config";
import { getReviews, addReview, setReviewVisibility, deleteReview } from "@/app/(owner)/owner/reviews/actions";

let sb: SupabaseMock;

beforeEach(() => {
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
  vi.mocked(getStudioId).mockResolvedValue("studio-1");
});

describe("getReviews", () => {
  it("returns an empty array when not signed in", async () => {
    vi.mocked(getStudioId).mockResolvedValue(null);
    expect(await getReviews()).toEqual([]);
  });

  it("returns the studio's reviews", async () => {
    sb.queueFrom("reviews", [{ id: "r1", author_name: "Jane", rating: 5, quote: "Great!", is_public: true, booking_id: null, created_at: "2026-01-01" }]);
    const reviews = await getReviews();
    expect(reviews).toHaveLength(1);
  });
});

describe("addReview", () => {
  it("errors when not signed in", async () => {
    vi.mocked(getStudioId).mockResolvedValue(null);
    const result = await addReview({ authorName: "Jane", rating: 5, quote: "Great!" });
    expect(result.error).toBe("Unauthorized");
  });

  it("rejects an out-of-range rating", async () => {
    const result = await addReview({ authorName: "Jane", rating: 0, quote: "Great!" });
    expect(result.error).toMatch(/1 and 5/);
  });

  it("rejects an empty author name", async () => {
    const result = await addReview({ authorName: "  ", rating: 5, quote: "Great!" });
    expect(result.error).toMatch(/name is required/);
  });

  it("inserts a manual testimonial with no booking_id/client_account_id", async () => {
    sb.queueFrom("reviews", { success: true });
    const result = await addReview({ authorName: "Jane", rating: 5, quote: "Great!" });
    expect(result.error).toBeUndefined();

    const insertArg = (sb.getChain("reviews") as { insert: { mock: { calls: unknown[][] } } }).insert.mock.calls[0][0] as Record<string, unknown>;
    expect(insertArg.booking_id).toBeUndefined();
    expect(insertArg.client_account_id).toBeUndefined();
    expect(insertArg.studio_id).toBe("studio-1");
  });
});

describe("setReviewVisibility", () => {
  it("updates is_public scoped to the caller's studio", async () => {
    sb.queueFrom("reviews", { success: true });
    const result = await setReviewVisibility("r1", true);
    expect(result.error).toBeUndefined();
    const updateChain = sb.getChain("reviews");
    expect((updateChain as { update: { mock: { calls: unknown[][] } } }).update.mock.calls[0][0]).toEqual({ is_public: true });
    expect(updateChain.eq).toHaveBeenCalledWith("studio_id", "studio-1");
  });
});

describe("deleteReview", () => {
  it("deletes scoped to the caller's studio", async () => {
    sb.queueFrom("reviews", { success: true });
    const result = await deleteReview("r1");
    expect(result.error).toBeUndefined();
    const deleteChain = sb.getChain("reviews");
    expect(deleteChain.eq).toHaveBeenCalledWith("studio_id", "studio-1");
  });
});
