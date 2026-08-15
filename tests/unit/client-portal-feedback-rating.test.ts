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
import { submitFeedbackRating } from "@/app/portal/[studio]/projects/[id]/actions";

let sb: SupabaseMock;

beforeEach(() => {
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
  vi.mocked(ensureClientAccount).mockResolvedValue({ id: "account-1" } as never);
});

describe("submitFeedbackRating", () => {
  it("errors when not signed in", async () => {
    vi.mocked(ensureClientAccount).mockResolvedValue(null as never);
    const result = await submitFeedbackRating("bk-1", 5);
    expect(result.error).toMatch(/not signed in/i);
  });

  it("rejects an out-of-range rating", async () => {
    const result = await submitFeedbackRating("bk-1", 6);
    expect(result.error).toMatch(/1 and 5/);
  });

  it("rejects a non-integer rating", async () => {
    const result = await submitFeedbackRating("bk-1", 3.5);
    expect(result.error).toMatch(/1 and 5/);
  });

  it("errors when the client has no ownership chain to this booking", async () => {
    sb.queueFrom("ai_chats", []);
    const result = await submitFeedbackRating("bk-1", 5);
    expect(result.error).toMatch(/not found/i);
  });

  it("errors when another client's booking id is guessed (cross-client isolation)", async () => {
    sb.queueFrom("ai_chats", [{ consultation_id: "proj-mine" }]);
    sb.queueFrom("consultations", null); // no consultation matches booking_id within this client's set
    const result = await submitFeedbackRating("someone-elses-booking", 5);
    expect(result.error).toMatch(/not found/i);
    expect(sb.fromCalls).not.toContain("bookings");
  });

  it("rejects a booking that is not completed", async () => {
    sb.queueFrom("ai_chats", [{ consultation_id: "proj-1" }]);
    sb.queueFrom("consultations", { id: "proj-1" });
    sb.queueFrom("bookings", { id: "bk-1", status: "confirmed", feedback_rating: null });
    const result = await submitFeedbackRating("bk-1", 5);
    expect(result.error).toMatch(/session is completed/);
  });

  it("rejects a second submission for the same booking", async () => {
    sb.queueFrom("ai_chats", [{ consultation_id: "proj-1" }]);
    sb.queueFrom("consultations", { id: "proj-1" });
    sb.queueFrom("bookings", { id: "bk-1", status: "completed", feedback_rating: 4 });
    const result = await submitFeedbackRating("bk-1", 5);
    expect(result.error).toMatch(/already submitted feedback/);
  });

  it("submits a rating for a completed, unrated booking", async () => {
    sb.queueFrom("ai_chats", [{ consultation_id: "proj-1" }]);
    sb.queueFrom("consultations", { id: "proj-1" });
    sb.queueFrom("bookings", { id: "bk-1", status: "completed", feedback_rating: null });
    sb.queueFrom("bookings", [{ id: "bk-1" }]); // update matched one row

    const result = await submitFeedbackRating("bk-1", 4);
    expect(result.error).toBeUndefined();

    const updateChain = sb.getChain("bookings", 2);
    const updateArg = (updateChain as { update: { mock: { calls: unknown[][] } } }).update.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(updateArg.feedback_rating).toBe(4);
    expect(typeof updateArg.feedback_submitted_at).toBe("string");
  });

  it("translates a lost optimistic-lock race into a friendly duplicate error", async () => {
    sb.queueFrom("ai_chats", [{ consultation_id: "proj-1" }]);
    sb.queueFrom("consultations", { id: "proj-1" });
    sb.queueFrom("bookings", { id: "bk-1", status: "completed", feedback_rating: null });
    sb.queueFrom("bookings", []); // .is("feedback_rating", null) update matched nothing — lost the race

    const result = await submitFeedbackRating("bk-1", 5);
    expect(result.error).toMatch(/already submitted feedback/);
  });
});
