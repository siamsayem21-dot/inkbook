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
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioId } from "@/lib/auth/config";
import { trySendSms } from "@/lib/twilio/client";
import { sendSessionScheduledEmail, sendBookingCancelledEmail } from "@/lib/email";
import { assignSchedule, markCompleted, cancelBooking } from "@/app/(owner)/owner/bookings/[bookingId]/actions";

let sb: SupabaseMock;

beforeEach(() => {
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
  vi.mocked(getStudioId).mockResolvedValue("studio-1");
  vi.mocked(trySendSms).mockClear();
  vi.mocked(sendSessionScheduledEmail).mockClear();
  vi.mocked(sendBookingCancelledEmail).mockClear();
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
    sb.queueFrom("consent_forms", { id: "cf-1" }); // bookingHasConsent -> true
    sb.queueFrom("bookings", { success: true }); // final update
    sb.queueFrom("custom_requests", { success: true }); // sync (0 or 1 rows, doesn't matter)
    sb.queueFrom("clients", { full_name: "Jane Client", email: "jane@example.com", phone: "+15551234567" });
    sb.queueFrom("artists", { name: "Artist X" });
    sb.queueFrom("studios", { name: "Studio Y", address: "123 Main St" });

    const result = await assignSchedule("bk-1", "2099-09-01", "14:00");
    expect(result.error).toBeUndefined();
    expect(result.confirmed).toBe(true);

    const finalUpdate = sb.getChain("bookings", 3);
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

  it("completes a confirmed booking with signed consent", async () => {
    sb.queueFrom("bookings", { studio_id: "studio-1", status: "confirmed" });
    sb.queueFrom("consent_forms", { id: "cf-1" }); // bookingHasConsent -> true
    sb.queueFrom("bookings", { success: true }); // final update

    const result = await markCompleted("bk-1");
    expect(result.error).toBeUndefined();

    const finalUpdate = sb.getChain("bookings", 2);
    const updateArg = (finalUpdate as { update: { mock: { calls: unknown[][] } } }).update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateArg.status).toBe("completed");
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
