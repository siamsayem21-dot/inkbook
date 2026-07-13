import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/auth/config", () => ({ getStudioId: vi.fn() }));
vi.mock("@/lib/stripe/client", () => ({ getStripe: vi.fn() }));
vi.mock("@/lib/twilio/client", () => ({
  trySendSms: vi.fn(() => Promise.resolve()),
  buildSmsMessage: vi.fn((type: string) => `sms:${type}`),
}));
vi.mock("@/lib/email", () => ({
  sendSessionScheduledEmail: vi.fn(() => Promise.resolve()),
  sendBookingCancelledEmail: vi.fn(() => Promise.resolve()),
  sendRemainderRequestEmail: vi.fn(() => Promise.resolve()),
  sendAftercareEmail: vi.fn(() => Promise.resolve()),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioId } from "@/lib/auth/config";
import { getStripe } from "@/lib/stripe/client";
import { trySendSms } from "@/lib/twilio/client";
import { sendSessionScheduledEmail, sendBookingCancelledEmail, sendRemainderRequestEmail, sendAftercareEmail } from "@/lib/email";
import { assignSchedule, markCompleted, cancelBooking, requestRemainderPayment } from "@/app/(owner)/owner/bookings/[bookingId]/actions";

let sb: SupabaseMock;

beforeEach(() => {
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
  vi.mocked(getStudioId).mockResolvedValue("studio-1");
  vi.mocked(trySendSms).mockClear();
  vi.mocked(sendSessionScheduledEmail).mockClear();
  vi.mocked(sendBookingCancelledEmail).mockClear();
  vi.mocked(sendRemainderRequestEmail).mockClear();
  vi.mocked(sendAftercareEmail).mockClear();
});

describe("assignSchedule — Phase C Feature 1 gate", () => {
  it("errors when not signed in", async () => {
    vi.mocked(getStudioId).mockResolvedValue(null);
    const result = await assignSchedule("bk-1", "2026-09-01", "14:00");
    expect(result.error).toBe("Unauthorized");
  });

  it("rejects an invalid date format", async () => {
    const result = await assignSchedule("bk-1", "09/01/2026", "14:00");
    expect(result.error).toMatch(/date is required/);
  });

  it("rejects a booking that isn't awaiting_schedule", async () => {
    sb.queueFrom("bookings", { id: "bk-1", studio_id: "studio-1", artist_id: "art-1", status: "confirmed" });
    const result = await assignSchedule("bk-1", "2099-09-01", "14:00");
    expect(result.error).toMatch(/already in 'confirmed'/);
  });

  it("rejects on artist schedule conflict", async () => {
    sb.queueFrom("bookings", { id: "bk-1", studio_id: "studio-1", artist_id: "art-1", status: "awaiting_schedule" });
    sb.queueFrom("bookings", [{ id: "other-bk" }]); // conflict rows
    const result = await assignSchedule("bk-1", "2099-09-01", "14:00");
    expect(result.error).toMatch(/already has a booking/);
  });

  it("rejects when the artist is at their monthly booking cap for that month (Phase C Feature 6)", async () => {
    sb.queueFrom("bookings", { id: "bk-1", studio_id: "studio-1", artist_id: "art-1", status: "awaiting_schedule" });
    sb.queueFrom("bookings", []); // no conflict
    sb.queueFrom("artists", { name: "Artist X", monthly_booking_cap: 2 });
    sb.queueFrom("bookings", [{ id: "bk-a" }, { id: "bk-b" }]); // 2 bookings that month — at cap

    const result = await assignSchedule("bk-1", "2099-09-01", "14:00");
    expect(result.error).toMatch(/at capacity for that month/);
  });

  it("sets date/time but stays awaiting_schedule when consent has not been signed yet", async () => {
    sb.queueFrom("bookings", {
      id: "bk-1", studio_id: "studio-1", artist_id: "art-1", status: "awaiting_schedule",
      client_id: "c1", deposit_amount_cents: 10000, total_amount_cents: null,
    });
    sb.queueFrom("bookings", []); // no conflict
    sb.queueFrom("consent_forms", null); // bookingHasConsent -> false
    sb.queueFrom("bookings", { success: true }); // final update

    const result = await assignSchedule("bk-1", "2099-09-01", "14:00");
    expect(result.error).toBeUndefined();
    expect(result.confirmed).toBeUndefined();

    const finalUpdate = sb.getChain("bookings", 3);
    const updateArg = (finalUpdate as { update: { mock: { calls: unknown[][] } } }).update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateArg.status).toBeUndefined();
    expect(updateArg.date).toBe("2099-09-01");

    expect(trySendSms).not.toHaveBeenCalled();
    expect(sendSessionScheduledEmail).not.toHaveBeenCalled();
  });

  it("confirms and notifies the client when consent was already signed", async () => {
    sb.queueFrom("bookings", {
      id: "bk-1", studio_id: "studio-1", artist_id: "art-1", status: "awaiting_schedule",
      client_id: "c1", deposit_amount_cents: 10000, total_amount_cents: 50000,
    });
    sb.queueFrom("bookings", []); // no conflict
    sb.queueFrom("artists", { name: "Artist X", monthly_booking_cap: 20 }); // monthly cap check (Phase C Feature 6)
    sb.queueFrom("bookings", []); // monthly cap count — under cap
    sb.queueFrom("consent_forms", { id: "cf-1" }); // bookingHasConsent -> true
    sb.queueFrom("bookings", { success: true }); // final update
    sb.queueFrom("custom_requests", { success: true }); // sync (0 or 1 rows, doesn't matter)
    sb.queueFrom("clients", { full_name: "Jane Client", email: "jane@example.com", phone: "+15551234567" });
    sb.queueFrom("artists", { name: "Artist X" });
    sb.queueFrom("studios", { name: "Studio Y", address: "123 Main St" });

    const result = await assignSchedule("bk-1", "2099-09-01", "14:00");
    expect(result.error).toBeUndefined();
    expect(result.confirmed).toBe(true);

    const finalUpdate = sb.getChain("bookings", 4);
    const updateArg = (finalUpdate as { update: { mock: { calls: unknown[][] } } }).update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateArg.status).toBe("confirmed");

    expect(trySendSms).toHaveBeenCalledWith("+15551234567", expect.any(String));
    expect(sendSessionScheduledEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "jane@example.com" }));
  });
});

describe("markCompleted — Phase C Feature 1 rules 1 & 2", () => {
  it("rejects a booking that is not confirmed", async () => {
    sb.queueFrom("bookings", { studio_id: "studio-1", status: "awaiting_schedule" });
    const result = await markCompleted("bk-1");
    expect(result.error).toMatch(/Only confirmed/);
  });

  it("rejects a cancelled booking", async () => {
    sb.queueFrom("bookings", { studio_id: "studio-1", status: "cancelled" });
    const result = await markCompleted("bk-1");
    expect(result.error).toMatch(/Only confirmed/);
  });

  it("rejects a confirmed booking with no signed consent (classic-flow edge case, Rule 1)", async () => {
    sb.queueFrom("bookings", { studio_id: "studio-1", status: "confirmed" });
    sb.queueFrom("consent_forms", null); // bookingHasConsent -> false
    const result = await markCompleted("bk-1");
    expect(result.error).toMatch(/Consent form must be signed/);
  });

  it("completes a confirmed booking with signed consent and sets completed_at", async () => {
    sb.queueFrom("bookings", { studio_id: "studio-1", status: "confirmed", client_id: "c1", artist_id: "art-1" });
    sb.queueFrom("consent_forms", { id: "cf-1" }); // bookingHasConsent -> true
    sb.queueFrom("bookings", { success: true }); // final update
    sb.queueFrom("clients", { full_name: "Jane Client", email: "jane@example.com", phone: "+15551234567" });
    sb.queueFrom("artists", { name: "Artist X" });
    sb.queueFrom("studios", { name: "Studio Y" });

    const result = await markCompleted("bk-1");
    expect(result.error).toBeUndefined();

    const finalUpdate = sb.getChain("bookings", 2);
    const updateArg = (finalUpdate as { update: { mock: { calls: unknown[][] } } }).update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateArg.status).toBe("completed");
    expect(typeof updateArg.completed_at).toBe("string");
  });

  it("fires the aftercare SMS and email (Phase C Feature 4) after completion", async () => {
    sb.queueFrom("bookings", { studio_id: "studio-1", status: "confirmed", client_id: "c1", artist_id: "art-1" });
    sb.queueFrom("consent_forms", { id: "cf-1" });
    sb.queueFrom("bookings", { success: true });
    sb.queueFrom("clients", { full_name: "Jane Client", email: "jane@example.com", phone: "+15551234567" });
    sb.queueFrom("artists", { name: "Artist X" });
    sb.queueFrom("studios", { name: "Studio Y" });

    await markCompleted("bk-1");

    expect(trySendSms).toHaveBeenCalledWith("+15551234567", "sms:aftercare");
    expect(sendAftercareEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "jane@example.com", clientName: "Jane Client", studioName: "Studio Y", artistName: "Artist X" })
    );
  });

  it("does not send aftercare notifications when the client has no email/phone on file", async () => {
    sb.queueFrom("bookings", { studio_id: "studio-1", status: "confirmed", client_id: "c1", artist_id: "art-1" });
    sb.queueFrom("consent_forms", { id: "cf-1" });
    sb.queueFrom("bookings", { success: true });
    sb.queueFrom("clients", { full_name: "Jane Client", email: null, phone: null });
    sb.queueFrom("artists", { name: "Artist X" });
    sb.queueFrom("studios", { name: "Studio Y" });

    const result = await markCompleted("bk-1");
    expect(result.error).toBeUndefined();
    expect(trySendSms).not.toHaveBeenCalled();
    expect(sendAftercareEmail).not.toHaveBeenCalled();
  });
});

describe("cancelBooking — client notifications", () => {
  it("does not notify when the booking was already cancelled", async () => {
    sb.queueFrom("bookings", { studio_id: "studio-1", client_id: "c1" }); // ownership check
    sb.queueFrom("bookings", []); // .neq("status","cancelled") update matched nothing

    const result = await cancelBooking("bk-1");
    expect(result.error).toBeUndefined();
    expect(trySendSms).not.toHaveBeenCalled();
    expect(sendBookingCancelledEmail).not.toHaveBeenCalled();
  });

  it("notifies the client by SMS and email on a real cancellation", async () => {
    sb.queueFrom("bookings", { studio_id: "studio-1", client_id: "c1" }); // ownership check
    sb.queueFrom("bookings", [{ id: "bk-1" }]); // update matched one row
    sb.queueFrom("clients", { full_name: "Jane Client", email: "jane@example.com", phone: "+15551234567" });
    sb.queueFrom("studios", { name: "Studio Y" });

    const result = await cancelBooking("bk-1");
    expect(result.error).toBeUndefined();
    expect(trySendSms).toHaveBeenCalledWith("+15551234567", "sms:cancellation");
    expect(sendBookingCancelledEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "jane@example.com", studioName: "Studio Y" })
    );
  });
});

describe("requestRemainderPayment — Phase C Feature 2", () => {
  it("errors when not signed in", async () => {
    vi.mocked(getStudioId).mockResolvedValue(null);
    const result = await requestRemainderPayment("bk-1");
    expect(result.error).toBe("Unauthorized");
  });

  it("errors when the remainder was already collected", async () => {
    sb.queueFrom("bookings", {
      id: "bk-1", studio_id: "studio-1", artist_id: "art-1",
      deposit_amount_cents: 10000, total_amount_cents: 50000, quote_amount_cents: null,
      remainder_collected: true, clients: { email: "jane@example.com", full_name: "Jane", phone: "+15551234567" },
      artists: { name: "Artist X" },
    });
    const result = await requestRemainderPayment("bk-1");
    expect(result.error).toMatch(/already been collected/);
  });

  it("errors when the booking has no agreed total price (classic self-serve booking)", async () => {
    sb.queueFrom("bookings", {
      id: "bk-1", studio_id: "studio-1", artist_id: "art-1",
      deposit_amount_cents: 10000, total_amount_cents: null, quote_amount_cents: null,
      remainder_collected: false, clients: { email: "jane@example.com", full_name: "Jane", phone: "+15551234567" },
      artists: { name: "Artist X" },
    });
    const result = await requestRemainderPayment("bk-1");
    expect(result.error).toMatch(/no agreed total price/);
  });

  it("errors when there is no remaining balance (deposit already covers the total)", async () => {
    sb.queueFrom("bookings", {
      id: "bk-1", studio_id: "studio-1", artist_id: "art-1",
      deposit_amount_cents: 10000, total_amount_cents: 10000, quote_amount_cents: null,
      remainder_collected: false, clients: { email: "jane@example.com", full_name: "Jane", phone: "+15551234567" },
      artists: { name: "Artist X" },
    });
    const result = await requestRemainderPayment("bk-1");
    expect(result.error).toMatch(/no remaining balance/);
  });

  it("creates a remainder checkout session and notifies the client", async () => {
    sb.queueFrom("bookings", {
      id: "bk-1", studio_id: "studio-1", artist_id: "art-1",
      deposit_amount_cents: 10000, total_amount_cents: 50000, quote_amount_cents: null,
      remainder_collected: false, clients: { email: "jane@example.com", full_name: "Jane", phone: "+15551234567" },
      artists: { name: "Artist X" },
    });
    sb.queueFrom("studios", { name: "Studio Y" }); // requestRemainderPayment's own studio lookup
    sb.queueFrom("deposit_payments", []); // getOrCreateDepositCheckoutSession: existingRows
    sb.queueFrom("deposit_payments", []); // pendingRows
    sb.queueFrom("deposit_payments", { id: "dp-new" }); // insert
    sb.queueFrom("deposit_payments", { success: true }); // update session id

    vi.mocked(getStripe).mockReturnValue({
      checkout: {
        sessions: {
          create: vi.fn(() => Promise.resolve({ id: "cs_remainder_1", url: "https://stripe.test/remainder" })),
        },
      },
    } as unknown as ReturnType<typeof getStripe>);

    const result = await requestRemainderPayment("bk-1");
    expect(result.error).toBeUndefined();
    expect(result.checkoutUrl).toBe("https://stripe.test/remainder");

    const insertArg = (sb.getChain("deposit_payments", 3) as { insert: { mock: { calls: unknown[][] } } })
      .insert.mock.calls[0][0] as Record<string, unknown>;
    expect(insertArg.payment_type).toBe("remainder");
    expect(insertArg.amount_cents).toBe(40000); // 50000 total - 10000 deposit

    expect(trySendSms).toHaveBeenCalledWith("+15551234567", "sms:remainder_pending");
    expect(sendRemainderRequestEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "jane@example.com", balanceDueCents: 40000 })
    );
  });
});
