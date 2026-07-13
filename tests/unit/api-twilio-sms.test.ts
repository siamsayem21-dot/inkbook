import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/twilio/client", () => ({
  buildSmsMessage: vi.fn((type: string) => `sms:${type}`),
  trySendSms: vi.fn(() => Promise.resolve()),
}));

import { trySendSms } from "@/lib/twilio/client";
import { POST } from "@/app/api/twilio/sms/route";

const VALID_BODY = {
  to: "+15551234567",
  bookingId: "bk-1",
  type: "booking_confirmed",
  studioName: "Ink & Iron",
};

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/twilio/sms", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", ...headers },
  });
}

const ORIGINAL_CRON_SECRET = process.env.CRON_SECRET;

beforeEach(() => {
  vi.mocked(trySendSms).mockClear();
});

afterEach(() => {
  process.env.CRON_SECRET = ORIGINAL_CRON_SECRET;
});

describe("POST /api/twilio/sms — fails closed when CRON_SECRET is unset", () => {
  it("401s and never sends SMS when CRON_SECRET is unset, even with no auth header", async () => {
    delete process.env.CRON_SECRET;
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(401);
    expect(trySendSms).not.toHaveBeenCalled();
  });

  it("401s when CRON_SECRET is unset even if the request guesses 'Bearer undefined'", async () => {
    delete process.env.CRON_SECRET;
    const res = await POST(makeRequest(VALID_BODY, { authorization: "Bearer undefined" }));
    expect(res.status).toBe(401);
    expect(trySendSms).not.toHaveBeenCalled();
  });

  it("401s when CRON_SECRET is set but the header doesn't match", async () => {
    process.env.CRON_SECRET = "the-real-secret";
    const res = await POST(makeRequest(VALID_BODY, { authorization: "Bearer wrong" }));
    expect(res.status).toBe(401);
    expect(trySendSms).not.toHaveBeenCalled();
  });

  it("sends SMS when CRON_SECRET is set and the header matches", async () => {
    process.env.CRON_SECRET = "the-real-secret";
    const res = await POST(makeRequest(VALID_BODY, { authorization: "Bearer the-real-secret" }));
    expect(res.status).toBe(200);
    expect(trySendSms).toHaveBeenCalledWith(VALID_BODY.to, "sms:booking_confirmed");
  });
});
