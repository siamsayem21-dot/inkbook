import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/twilio/client", () => ({
  trySendSms: vi.fn(() => Promise.resolve()),
  buildSmsMessage: vi.fn((type: string) => `sms:${type}`),
}));
vi.mock("@/lib/remainder-payment", () => ({
  sendRemainderPaymentRequest: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { trySendSms } from "@/lib/twilio/client";
import { sendRemainderPaymentRequest } from "@/lib/remainder-payment";
import { GET } from "@/app/api/cron/payment-reminders/route";

let sb: SupabaseMock;

function cronRequest(authorized = true) {
  return new NextRequest("http://localhost/api/cron/payment-reminders", {
    headers: authorized ? { authorization: `Bearer ${process.env.CRON_SECRET}` } : {},
  });
}

beforeEach(() => {
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
  vi.mocked(trySendSms).mockClear();
  vi.mocked(sendRemainderPaymentRequest).mockReset();
});

describe("GET /api/cron/payment-reminders", () => {
  it("401s without the correct CRON_SECRET bearer token", async () => {
    const res = await GET(cronRequest(false));
    expect(res.status).toBe(401);
  });

  describe("deposit reminder pass", () => {
    it("returns 0 when no bookings are in the eligibility window", async () => {
      sb.queueFrom("bookings", []); // deposit fetch
      sb.queueFrom("bookings", []); // remainder fetch
      const res = await GET(cronRequest());
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.depositRemindersSent).toBe(0);
    });

    it("500s when the deposit-eligibility fetch fails", async () => {
      sb.queueFrom("bookings", null, { message: "db error" });
      const res = await GET(cronRequest());
      expect(res.status).toBe(500);
    });

    it("sends the reminder SMS and marks deposit_reminder_sent for an eligible booking", async () => {
      sb.queueFrom("bookings", [{ id: "bk-1", client_id: "c1", studio_id: "s1" }]); // deposit fetch
      sb.queueFrom("clients", { phone: "5551110000" });
      sb.queueFrom("studios", { name: "Ink & Iron" });
      sb.queueFrom("bookings", { success: true }); // mark deposit_reminder_sent
      sb.queueFrom("bookings", []); // remainder fetch

      const res = await GET(cronRequest());
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.depositRemindersSent).toBe(1);
      expect(trySendSms).toHaveBeenCalledWith("5551110000", "sms:deposit_pending");

      const markChain = sb.getChain("bookings", 2);
      expect((markChain as { update: { mock: { calls: unknown[][] } } }).update.mock.calls[0][0]).toEqual(
        expect.objectContaining({ deposit_reminder_sent: true })
      );
    });

    it("still marks the flag (no retry storm) even when the client has no phone on file", async () => {
      sb.queueFrom("bookings", [{ id: "bk-1", client_id: "c1", studio_id: "s1" }]);
      sb.queueFrom("clients", { phone: null });
      sb.queueFrom("studios", { name: "Ink & Iron" });
      sb.queueFrom("bookings", { success: true });
      sb.queueFrom("bookings", []); // remainder fetch

      const res = await GET(cronRequest());
      const body = await res.json();
      expect(body.depositRemindersSent).toBe(1);
      expect(trySendSms).not.toHaveBeenCalled();
    });
  });

  describe("remainder reminder pass", () => {
    it("returns 0 when no bookings are eligible", async () => {
      sb.queueFrom("bookings", []); // deposit fetch
      sb.queueFrom("bookings", []); // remainder fetch
      const res = await GET(cronRequest());
      const body = await res.json();
      expect(body.remainderRemindersSent).toBe(0);
    });

    it("500s when the remainder-eligibility fetch fails", async () => {
      sb.queueFrom("bookings", []); // deposit fetch succeeds
      sb.queueFrom("bookings", null, { message: "db error" }); // remainder fetch fails
      const res = await GET(cronRequest());
      expect(res.status).toBe(500);
    });

    it("skips a booking with no agreed total price without calling sendRemainderPaymentRequest", async () => {
      sb.queueFrom("bookings", []); // deposit fetch
      sb.queueFrom("bookings", [
        {
          id: "bk-1", artist_id: "art-1", client_id: "c1", studio_id: "s1",
          deposit_amount_cents: 10000, total_amount_cents: null, quote_amount_cents: null,
        },
      ]);

      const res = await GET(cronRequest());
      const body = await res.json();
      expect(body.remainderRemindersSent).toBe(0);
      expect(sendRemainderPaymentRequest).not.toHaveBeenCalled();
    });

    it("calls sendRemainderPaymentRequest and marks the flag on success", async () => {
      sb.queueFrom("bookings", []); // deposit fetch
      sb.queueFrom("bookings", [
        {
          id: "bk-1", artist_id: "art-1", client_id: "c1", studio_id: "s1",
          deposit_amount_cents: 10000, total_amount_cents: 50000, quote_amount_cents: null,
        },
      ]);
      sb.queueFrom("artists", { name: "Artist X" });
      sb.queueFrom("clients", { full_name: "Jane", email: "jane@example.com", phone: "5551234567" });
      sb.queueFrom("studios", { name: "Studio Y" });
      sb.queueFrom("bookings", { success: true }); // mark remainder_reminder_sent

      vi.mocked(sendRemainderPaymentRequest).mockResolvedValue({ checkoutUrl: "https://stripe.test/cs" });

      const res = await GET(cronRequest());
      const body = await res.json();
      expect(body.remainderRemindersSent).toBe(1);
      expect(sendRemainderPaymentRequest).toHaveBeenCalledWith(
        expect.objectContaining({ bookingId: "bk-1", balanceDueCents: 40000, clientEmail: "jane@example.com" })
      );
    });

    it("does not mark the flag when sendRemainderPaymentRequest fails (retried on next run)", async () => {
      sb.queueFrom("bookings", []); // deposit fetch
      sb.queueFrom("bookings", [
        {
          id: "bk-1", artist_id: "art-1", client_id: "c1", studio_id: "s1",
          deposit_amount_cents: 10000, total_amount_cents: 50000, quote_amount_cents: null,
        },
      ]);
      sb.queueFrom("artists", { name: "Artist X" });
      sb.queueFrom("clients", { full_name: "Jane", email: "jane@example.com", phone: "5551234567" });
      sb.queueFrom("studios", { name: "Studio Y" });

      vi.mocked(sendRemainderPaymentRequest).mockResolvedValue({ error: "Stripe is not configured." });

      const res = await GET(cronRequest());
      const body = await res.json();
      expect(body.remainderRemindersSent).toBe(0);
      // Must not have attempted a "mark sent" update — only 4 "bookings" calls total
      // (deposit fetch, remainder fetch, and none for marking).
      expect(sb.fromCalls.filter((t) => t === "bookings")).toHaveLength(2);
    });
  });
});
