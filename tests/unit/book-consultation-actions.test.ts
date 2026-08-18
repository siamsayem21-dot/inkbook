import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/auth/config", () => ({ getStudioId: vi.fn() }));
vi.mock("@/lib/stripe/deposit-checkout", () => ({
  capDepositAmountCents: vi.fn((studioDefault: number) => studioDefault),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioId } from "@/lib/auth/config";
import { bookConsultation } from "@/app/book/[studio]/consult/actions";

let sb: SupabaseMock;

const CONSULT = {
  id: "consult-1", studio_id: "studio-1", client_name: "Alex Client",
  client_email: "alex@example.com", client_phone: "+15551234567",
  // "deposit_paid" — bookConsultation() only allows booking past that point
  // (see tests/unit/consultation-lifecycle-guards.test.ts for that guard's own
  // coverage); these tests are specifically about blacklist enforcement, so the
  // fixture status just needs to be a bookable one, not "quoted".
  detected_style: "Traditional", status: "deposit_paid", booking_id: null, final_price: 500,
};
const STUDIO = { id: "studio-1", deposit_amount_cents: 10000 };
const REQ = { artistId: "artist-1", date: "2099-09-01", time: "14:00" };

beforeEach(() => {
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
  vi.mocked(getStudioId).mockResolvedValue("studio-1");
});

describe("bookConsultation — blacklist enforcement (twin path of continueToDeposit)", () => {
  it("rejects a blacklisted client before checking the monthly cap or creating any booking", async () => {
    sb.queueFrom("consultations", CONSULT);
    sb.queueFrom("studios", STUDIO);
    sb.queueRpc(true); // is_client_blacklisted -> blocked

    const result = await bookConsultation("consult-1", REQ);

    expect(result.error).toMatch(/blacklisted/i);
    expect(result.bookingId).toBeUndefined();
    expect(sb.fromCalls).not.toContain("clients");
    expect(sb.fromCalls).not.toContain("bookings");
  });

  it("rejects an artist that doesn't belong to the caller's studio (cross-studio IDOR guard)", async () => {
    sb.queueFrom("consultations", CONSULT);
    sb.queueFrom("studios", STUDIO);
    sb.queueRpc(false); // not blacklisted
    sb.queueFrom("artists", null); // no row matches id+studio_id together
    const result = await bookConsultation("consult-1", { ...REQ, artistId: "artist-from-another-studio" });
    expect(result.error).toMatch(/artist not found/i);
    expect(sb.fromCalls).not.toContain("clients");
    expect(sb.fromCalls).not.toContain("bookings");
  });

  it("proceeds to create the booking for a non-blacklisted client", async () => {
    sb.queueFrom("consultations", CONSULT);
    sb.queueFrom("studios", STUDIO);
    sb.queueRpc(false); // is_client_blacklisted -> not blocked
    sb.queueFrom("artists", { name: "Artist X", monthly_booking_cap: 20 }); // cap check
    sb.queueFrom("bookings", []); // monthly count — under cap
    sb.queueFrom("clients", null); // no existing client
    sb.queueFrom("clients", { id: "client-1" }); // insert new client
    sb.queueFrom("bookings", { id: "bk-1" }); // insert booking
    sb.queueFrom("consultations", { success: true }); // link + advance status

    const result = await bookConsultation("consult-1", REQ);

    expect(result.error).toBeUndefined();
    expect(result.bookingId).toBe("bk-1");
  });
});
