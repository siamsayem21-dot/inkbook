import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/twilio/client", () => ({
  trySendSms: vi.fn(() => Promise.resolve()),
  buildSmsMessage: vi.fn((type: string) => `sms:${type}`),
}));
vi.mock("@/lib/email", () => ({
  sendReviewRequestEmail: vi.fn(() => Promise.resolve()),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { trySendSms } from "@/lib/twilio/client";
import { sendReviewRequestEmail } from "@/lib/email";
import { GET } from "@/app/api/cron/review-requests/route";

let sb: SupabaseMock;

function cronRequest(authorized = true) {
  return new NextRequest("http://localhost/api/cron/review-requests", {
    headers: authorized ? { authorization: `Bearer ${process.env.CRON_SECRET}` } : {},
  });
}

beforeEach(() => {
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
  vi.mocked(trySendSms).mockClear();
  vi.mocked(sendReviewRequestEmail).mockClear();
});

describe("GET /api/cron/review-requests", () => {
  it("401s without the correct CRON_SECRET bearer token", async () => {
    const res = await GET(cronRequest(false));
    expect(res.status).toBe(401);
  });

  it("returns 0 when no bookings are eligible", async () => {
    sb.queueFrom("bookings", []);
    const res = await GET(cronRequest());
    const body = await res.json();
    expect(body.requestsSent).toBe(0);
  });

  it("500s when the eligibility fetch fails", async () => {
    sb.queueFrom("bookings", null, { message: "db error" });
    const res = await GET(cronRequest());
    expect(res.status).toBe(500);
  });

  it("skips (and marks handled) a booking that already has a review", async () => {
    sb.queueFrom("bookings", [{ id: "bk-1", studio_id: "s1", artist_id: "art-1", client_id: "c1" }]);
    sb.queueFrom("reviews", { id: "existing-review" }); // existingReview lookup
    sb.queueFrom("bookings", { success: true }); // mark review_requested_at

    const res = await GET(cronRequest());
    const body = await res.json();
    expect(body.requestsSent).toBe(0);
    expect(trySendSms).not.toHaveBeenCalled();
    expect(sendReviewRequestEmail).not.toHaveBeenCalled();

    const markChain = sb.getChain("bookings", 2);
    expect((markChain as { update: { mock: { calls: unknown[][] } } }).update.mock.calls[0][0]).toEqual(
      expect.objectContaining({ review_requested_at: expect.any(String) })
    );
  });

  it("sends the review request and marks review_requested_at for an eligible booking", async () => {
    sb.queueFrom("bookings", [{ id: "bk-1", studio_id: "s1", artist_id: "art-1", client_id: "c1" }]);
    sb.queueFrom("reviews", null); // no existing review
    sb.queueFrom("studios", { name: "Ink & Iron", subdomain: "ink-iron" });
    sb.queueFrom("artists", { name: "Artist X" });
    sb.queueFrom("clients", { full_name: "Jane Client", email: "jane@example.com", phone: "5551234567" });
    sb.queueFrom("bookings", { success: true }); // mark review_requested_at

    const res = await GET(cronRequest());
    const body = await res.json();
    expect(body.requestsSent).toBe(1);

    expect(trySendSms).toHaveBeenCalledWith("5551234567", "sms:review_request");
    expect(sendReviewRequestEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "jane@example.com",
        clientName: "Jane Client",
        studioName: "Ink & Iron",
        artistName: "Artist X",
        reviewUrl: expect.stringContaining("/portal/ink-iron/bookings/bk-1/review"),
      })
    );
  });

  it("skips a booking whose studio can't be resolved without marking it handled", async () => {
    sb.queueFrom("bookings", [{ id: "bk-1", studio_id: "s1", artist_id: "art-1", client_id: "c1" }]);
    sb.queueFrom("reviews", null);
    sb.queueFrom("studios", null); // studio lookup fails
    sb.queueFrom("artists", { name: "Artist X" });
    sb.queueFrom("clients", { full_name: "Jane Client", email: "jane@example.com", phone: "5551234567" });

    const res = await GET(cronRequest());
    const body = await res.json();
    expect(body.requestsSent).toBe(0);
    expect(trySendSms).not.toHaveBeenCalled();
  });
});
