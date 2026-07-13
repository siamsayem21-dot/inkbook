import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/auth/config", () => ({ ensureClientAccount: vi.fn() }));
vi.mock("@/lib/stripe/deposit-checkout", () => ({
  getOrCreateDepositCheckoutSession: vi.fn(),
  capDepositAmountCents: vi.fn((studioDefault: number) => studioDefault),
}));
vi.mock("@/lib/messaging/threads", () => ({ getOrCreateThread: vi.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";
import { ensureClientAccount } from "@/lib/auth/config";
import { submitReview } from "@/app/portal/[studio]/projects/[id]/actions";

let sb: SupabaseMock;

beforeEach(() => {
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
  vi.mocked(ensureClientAccount).mockResolvedValue({ id: "account-1" } as never);
});

describe("submitReview — Phase C Feature 5", () => {
  it("errors when not signed in", async () => {
    vi.mocked(ensureClientAccount).mockResolvedValue(null as never);
    const result = await submitReview("bk-1", 5, "Great experience!");
    expect(result.error).toMatch(/not signed in/i);
  });

  it("rejects an out-of-range rating", async () => {
    const result = await submitReview("bk-1", 6, "Great!");
    expect(result.error).toMatch(/1 and 5/);
  });

  it("rejects an empty review", async () => {
    const result = await submitReview("bk-1", 5, "   ");
    expect(result.error).toMatch(/write a short review/);
  });

  it("errors when the client has no ownership chain to this booking", async () => {
    sb.queueFrom("ai_chats", []);
    const result = await submitReview("bk-1", 5, "Great!");
    expect(result.error).toMatch(/not found/i);
  });

  it("errors when another client's booking id is guessed (cross-client isolation)", async () => {
    sb.queueFrom("ai_chats", [{ consultation_id: "proj-mine" }]);
    sb.queueFrom("consultations", null); // no consultation matches booking_id within this client's set
    const result = await submitReview("someone-elses-booking", 5, "Great!");
    expect(result.error).toMatch(/not found/i);
    expect(sb.fromCalls).not.toContain("bookings");
  });

  it("rejects a booking that is not completed", async () => {
    sb.queueFrom("ai_chats", [{ consultation_id: "proj-1" }]);
    sb.queueFrom("consultations", { studio_id: "studio-1" });
    sb.queueFrom("bookings", { id: "bk-1", status: "confirmed", client_id: "c1" });
    const result = await submitReview("bk-1", 5, "Great!");
    expect(result.error).toMatch(/session is completed/);
  });

  it("rejects a duplicate review for the same booking", async () => {
    sb.queueFrom("ai_chats", [{ consultation_id: "proj-1" }]);
    sb.queueFrom("consultations", { studio_id: "studio-1" });
    sb.queueFrom("bookings", { id: "bk-1", status: "completed", client_id: "c1" });
    sb.queueFrom("reviews", { id: "existing-review" }); // existingReview lookup
    const result = await submitReview("bk-1", 5, "Great!");
    expect(result.error).toMatch(/already left a review/);
  });

  it("submits a review with is_public: false pending owner approval", async () => {
    sb.queueFrom("ai_chats", [{ consultation_id: "proj-1" }]);
    sb.queueFrom("consultations", { studio_id: "studio-1" });
    sb.queueFrom("bookings", { id: "bk-1", status: "completed", client_id: "c1" });
    sb.queueFrom("reviews", null); // no existing review
    sb.queueFrom("clients", { full_name: "Jane Client" });
    sb.queueFrom("reviews", { success: true }); // insert

    const result = await submitReview("bk-1", 4, "  Loved it!  ");
    expect(result.error).toBeUndefined();

    const insertChain = sb.getChain("reviews", 2);
    const insertArg = (insertChain as { insert: { mock: { calls: unknown[][] } } }).insert.mock.calls[0][0] as Record<string, unknown>;
    expect(insertArg).toEqual(
      expect.objectContaining({
        studio_id: "studio-1", booking_id: "bk-1", client_account_id: "account-1",
        author_name: "Jane Client", rating: 4, quote: "Loved it!", is_public: false, is_active: true,
      })
    );
  });

  it("translates a unique-violation race into a friendly duplicate error", async () => {
    sb.queueFrom("ai_chats", [{ consultation_id: "proj-1" }]);
    sb.queueFrom("consultations", { studio_id: "studio-1" });
    sb.queueFrom("bookings", { id: "bk-1", status: "completed", client_id: "c1" });
    sb.queueFrom("reviews", null); // pre-check found nothing
    sb.queueFrom("clients", { full_name: "Jane Client" });
    sb.queueFrom("reviews", null, { code: "23505", message: "duplicate key" }); // insert races and fails

    const result = await submitReview("bk-1", 5, "Great!");
    expect(result.error).toMatch(/already left a review/);
  });
});
