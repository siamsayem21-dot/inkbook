import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/twilio/client", () => ({
  trySendSms: vi.fn(() => Promise.resolve()),
  buildSmsMessage: vi.fn((type: string) => `sms:${type}`),
}));
vi.mock("@/lib/email", () => ({
  sendWaitlistSlotOpenEmail: vi.fn(() => Promise.resolve()),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { trySendSms } from "@/lib/twilio/client";
import { sendWaitlistSlotOpenEmail } from "@/lib/email";
import { GET } from "@/app/api/cron/waitlist-notify/route";

let sb: SupabaseMock;

function cronRequest(authorized = true) {
  return new NextRequest("http://localhost/api/cron/waitlist-notify", {
    headers: authorized ? { authorization: `Bearer ${process.env.CRON_SECRET}` } : {},
  });
}

beforeEach(() => {
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
  vi.mocked(trySendSms).mockClear();
  vi.mocked(sendWaitlistSlotOpenEmail).mockClear();
});

describe("GET /api/cron/waitlist-notify", () => {
  it("401s without the correct CRON_SECRET bearer token", async () => {
    const res = await GET(cronRequest(false));
    expect(res.status).toBe(401);
  });

  it("returns 0 when there are no active artists", async () => {
    sb.queueFrom("artists", []);
    const res = await GET(cronRequest());
    const body = await res.json();
    expect(body.notificationsSent).toBe(0);
  });

  it("500s when the artist fetch fails", async () => {
    sb.queueFrom("artists", null, { message: "db error" });
    const res = await GET(cronRequest());
    expect(res.status).toBe(500);
  });

  it("skips an artist with no waiting entries", async () => {
    sb.queueFrom("artists", [{ id: "art-1", name: "Artist X", studio_id: "s1", monthly_booking_cap: 20 }]);
    sb.queueFrom("waitlist", []); // no un-notified entries
    const res = await GET(cronRequest());
    const body = await res.json();
    expect(body.notificationsSent).toBe(0);
  });

  it("skips an artist still at capacity even with waiting entries", async () => {
    sb.queueFrom("artists", [{ id: "art-1", name: "Artist X", studio_id: "s1", monthly_booking_cap: 1 }]);
    sb.queueFrom("waitlist", [{ id: "wl-1", client_id: "c1" }]);
    sb.queueFrom("bookings", [{ id: "bk-1" }]); // 1 booking this month === cap

    const res = await GET(cronRequest());
    const body = await res.json();
    expect(body.notificationsSent).toBe(0);
    expect(trySendSms).not.toHaveBeenCalled();
  });

  it("notifies the oldest un-notified entry once a slot opens and marks it notified", async () => {
    sb.queueFrom("artists", [{ id: "art-1", name: "Artist X", studio_id: "s1", monthly_booking_cap: 5 }]);
    sb.queueFrom("waitlist", [{ id: "wl-1", client_id: "c1" }]); // oldest un-notified (already ordered by added_at asc)
    sb.queueFrom("bookings", [{ id: "bk-1" }, { id: "bk-2" }]); // 2 of 5 booked — under cap
    sb.queueFrom("clients", { full_name: "Jane Client", email: "jane@example.com", phone: "5551234567" });
    sb.queueFrom("studios", { name: "Ink & Iron", subdomain: "ink-iron" });
    sb.queueFrom("waitlist", { success: true }); // mark notified

    const res = await GET(cronRequest());
    const body = await res.json();
    expect(body.notificationsSent).toBe(1);

    expect(trySendSms).toHaveBeenCalledWith("5551234567", "sms:waitlist_slot_open");
    expect(sendWaitlistSlotOpenEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "jane@example.com", artistName: "Artist X", studioName: "Ink & Iron",
        bookUrl: expect.stringContaining("/book/ink-iron/art-1/book"),
      })
    );

    const markChain = sb.getChain("waitlist", 2);
    expect((markChain as { update: { mock: { calls: unknown[][] } } }).update.mock.calls[0][0]).toEqual({ notified: true });
  });
});
