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
import { continueToDeposit } from "@/app/portal/[studio]/projects/[id]/actions";

let sb: SupabaseMock;

beforeEach(() => {
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
  vi.mocked(ensureClientAccount).mockResolvedValue({ id: "account-1" } as never);
  vi.mocked(getOrCreateDepositCheckoutSession).mockClear();
});

describe("continueToDeposit — blacklist enforcement (Phase C Feature 1)", () => {
  it("rejects a blacklisted client before creating any booking or Stripe session", async () => {
    sb.queueFrom("ai_chats", { id: "chat-1" }); // ownership check
    sb.queueFrom("consultations", {
      id: "proj-1", studio_id: "studio-1", status: "quoted", quote_accepted_at: "2026-01-01T00:00:00Z",
      final_price: 500, artist_id: "artist-1", booking_id: null,
      client_name: "Blocked Client", client_email: "blocked@example.com", client_phone: "+15550000000",
      tattoo_description: "desc", detected_style: "Traditional",
    });
    sb.queueFrom("studios", { id: "studio-1", name: "Studio Y", subdomain: "studio-y", deposit_amount_cents: 10000 });
    sb.queueFrom("artists", { id: "artist-1", name: "Artist X" });
    sb.queueRpc(true); // is_client_blacklisted -> blocked

    const result = await continueToDeposit("proj-1");

    expect(result.error).toMatch(/contact the studio directly/i);
    expect(result.checkoutUrl).toBeUndefined();
    expect(sb.fromCalls).not.toContain("clients");
    expect(sb.fromCalls).not.toContain("bookings");
    expect(getOrCreateDepositCheckoutSession).not.toHaveBeenCalled();
  });

  it("proceeds to checkout for a non-blacklisted client", async () => {
    sb.queueFrom("ai_chats", { id: "chat-1" });
    sb.queueFrom("consultations", {
      id: "proj-1", studio_id: "studio-1", status: "quoted", quote_accepted_at: "2026-01-01T00:00:00Z",
      final_price: 500, artist_id: "artist-1", booking_id: "bk-1",
      client_name: "Good Client", client_email: "good@example.com", client_phone: "+15551234567",
      tattoo_description: "desc", detected_style: "Traditional",
    });
    sb.queueFrom("studios", { id: "studio-1", name: "Studio Y", subdomain: "studio-y", deposit_amount_cents: 10000 });
    sb.queueFrom("artists", { id: "artist-1", name: "Artist X" });
    sb.queueRpc(false); // is_client_blacklisted -> not blocked
    sb.queueFrom("bookings", { id: "bk-1", status: "pending_deposit", deposit_paid: false, deposit_amount_cents: 10000 });
    vi.mocked(getOrCreateDepositCheckoutSession).mockResolvedValue({ checkoutUrl: "https://stripe.test/session" });

    const result = await continueToDeposit("proj-1");

    expect(result.error).toBeUndefined();
    expect(result.checkoutUrl).toBe("https://stripe.test/session");
  });
});
