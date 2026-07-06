import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const messagesCreate = vi.fn(() => Promise.resolve({ sid: "SM123" }));

vi.mock("twilio", () => ({
  default: vi.fn(() => ({ messages: { create: messagesCreate } })),
}));

import { buildSmsMessage, sendSms, trySendSms } from "@/lib/twilio/client";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  messagesCreate.mockClear();
  process.env.TWILIO_ACCOUNT_SID = "AC_test";
  process.env.TWILIO_AUTH_TOKEN = "auth_test";
  process.env.TWILIO_PHONE_NUMBER = "+15550000000";
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("buildSmsMessage", () => {
  it("builds distinct templates per message type, all mentioning the studio name", () => {
    const types = ["booking_confirmed", "48hr_reminder", "day_of_reminder", "deposit_pending", "cancellation"] as const;
    const rendered = new Set(types.map((t) => buildSmsMessage(t, "Ink & Iron")));
    expect(rendered.size).toBe(types.length); // all templates are distinct
    for (const t of types) {
      expect(buildSmsMessage(t, "Ink & Iron")).toContain("Ink & Iron");
    }
  });
});

describe("sendSms", () => {
  it("calls the Twilio client with to/from/body", async () => {
    await sendSms("5551234567", "hello");
    expect(messagesCreate).toHaveBeenCalledWith({
      to: "5551234567",
      from: "+15550000000",
      body: "hello",
    });
  });
});

describe("trySendSms", () => {
  it("no-ops silently when Twilio env vars are not configured", async () => {
    delete process.env.TWILIO_ACCOUNT_SID;
    await trySendSms("5551234567", "hello");
    expect(messagesCreate).not.toHaveBeenCalled();
  });

  it("swallows errors from the Twilio SDK instead of throwing", async () => {
    messagesCreate.mockImplementationOnce(() => Promise.reject(new Error("twilio down")));
    await expect(trySendSms("5551234567", "hello")).resolves.toBeUndefined();
  });

  it("sends successfully when configured and Twilio succeeds", async () => {
    await trySendSms("5551234567", "hello");
    expect(messagesCreate).toHaveBeenCalledTimes(1);
  });
});
