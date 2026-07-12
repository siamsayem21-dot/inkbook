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
import { getOrCreateDepositCheckoutSession } from "@/lib/stripe/deposit-checkout";
import { payRemainderBalance } from "@/app/portal/[studio]/projects/[id]/actions";

let sb: SupabaseMock;

beforeEach(() => {
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
  vi.mocked(ensureClientAccount).mockResolvedValue({ id: "account-1" } as never);
  vi.mocked(getOrCreateDepositCheckoutSession).mockClear();
});

describe("payRemainderBalance — Phase C Feature 2", () => {
  it("errors when not signed in", async () => {
    vi.mocked(ensureClientAccount).mockResolvedValue(null as never);
    const result = await payRemainderBalance("bk-1");
    expect(result.error).toMatch(/not signed in/i);
  });

  it("errors when the client has no ownership chain to this booking", async () => {
    sb.queueFrom("ai_chats", []); // no submitted chats at all
    const result = await payRemainderBalance("bk-1");
    expect(result.error).toMatch(/not found/i);
  });

  it("errors when another client's booking id is guessed (cross-client isolation)", async () => {
    sb.queueFrom("ai_chats", [{ consultation_id: "proj-mine" }]); // this client's own chats
    sb.queueFrom("consultations", null); // no consultation matches booking_id within THIS client's consultation set
    const result = await payRemainderBalance("someone-elses-booking");
    expect(result.error).toMatch(/not found/i);
    expect(sb.fromCalls).not.toContain("bookings");
  });

  it("errors when the remainder was already collected", async () => {
    sb.queueFrom("ai_chats", [{ consultation_id: "proj-1" }]);
    sb.queueFrom("consultations", { studio_id: "studio-1" });
    sb.queueFrom("bookings", {
      id: "bk-1", artist_id: "art-1", client_id: "c1",
      deposit_amount_cents: 10000, total_amount_cents: 50000, quote_amount_cents: null,
      remainder_collected: true,
    });
    const result = await payRemainderBalance("bk-1");
    expect(result.error).toMatch(/already been paid/);
  });

  it("errors when there is no remaining balance to pay", async () => {
    sb.queueFrom("ai_chats", [{ consultation_id: "proj-1" }]);
    sb.queueFrom("consultations", { studio_id: "studio-1" });
    sb.queueFrom("bookings", {
      id: "bk-1", artist_id: "art-1", client_id: "c1",
      deposit_amount_cents: 50000, total_amount_cents: 50000, quote_amount_cents: null,
      remainder_collected: false,
    });
    const result = await payRemainderBalance("bk-1");
    expect(result.error).toMatch(/no remaining balance/i);
  });

  it("starts a remainder checkout for a valid, owned booking with a balance due", async () => {
    sb.queueFrom("ai_chats", [{ consultation_id: "proj-1" }]);
    sb.queueFrom("consultations", { studio_id: "studio-1" });
    sb.queueFrom("bookings", {
      id: "bk-1", artist_id: "art-1", client_id: "c1",
      deposit_amount_cents: 10000, total_amount_cents: 50000, quote_amount_cents: null,
      remainder_collected: false,
    });
    sb.queueFrom("studios", { name: "Studio Y", subdomain: "studio-y" });
    sb.queueFrom("artists", { name: "Artist X" });
    sb.queueFrom("clients", { email: "jane@example.com" });
    vi.mocked(getOrCreateDepositCheckoutSession).mockResolvedValue({ checkoutUrl: "https://stripe.test/remainder" });

    const result = await payRemainderBalance("bk-1");
    expect(result.error).toBeUndefined();
    expect(result.checkoutUrl).toBe("https://stripe.test/remainder");
    expect(getOrCreateDepositCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ bookingId: "bk-1", depositAmountCents: 40000, paymentType: "remainder" })
    );
  });
});
