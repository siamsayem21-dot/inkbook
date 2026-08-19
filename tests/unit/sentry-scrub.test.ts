import { describe, it, expect } from "vitest";
import { scrubObject, scrubSensitiveData } from "@/lib/sentry-scrub";
import type { ErrorEvent } from "@sentry/nextjs";

describe("scrubObject", () => {
  it("filters keys that look like secrets/credentials/payment data", () => {
    const result = scrubObject({
      password: "hunter2",
      stripeToken: "tok_123",
      authorization: "Bearer xyz",
      apiKey: "sk_live_abc",
      api_key: "sk_live_abc",
      cardNumber: "4242424242424242",
      cvc: "123",
      ssn: "123-45-6789",
      clientEmail: "real@example.com", // not sensitive -- preserved
      bookingId: "bk-1", // not sensitive -- preserved
    });

    expect(result.password).toBe("[Filtered]");
    expect(result.stripeToken).toBe("[Filtered]");
    expect(result.authorization).toBe("[Filtered]");
    expect(result.apiKey).toBe("[Filtered]");
    expect(result.api_key).toBe("[Filtered]");
    expect(result.cardNumber).toBe("[Filtered]");
    expect(result.cvc).toBe("[Filtered]");
    expect(result.ssn).toBe("[Filtered]");
    expect(result.clientEmail).toBe("real@example.com");
    expect(result.bookingId).toBe("bk-1");
  });

  it("recurses into nested objects and arrays", () => {
    const result = scrubObject({
      booking: { id: "bk-1", payment: { cardNumber: "4242424242424242" } },
      items: [{ token: "abc" }, { name: "safe" }],
    });

    expect(result.booking.payment.cardNumber).toBe("[Filtered]");
    expect(result.booking.id).toBe("bk-1");
    expect(result.items[0].token).toBe("[Filtered]");
    expect(result.items[1].name).toBe("safe");
  });

  it("leaves primitives and null untouched", () => {
    expect(scrubObject("hello")).toBe("hello");
    expect(scrubObject(42)).toBe(42);
    expect(scrubObject(null)).toBe(null);
    expect(scrubObject(undefined)).toBe(undefined);
  });
});

describe("scrubSensitiveData", () => {
  it("strips cookies and raw request body data from the event", () => {
    const event = {
      request: {
        cookies: { session: "abc123" },
        data: { password: "hunter2" },
        headers: { authorization: "Bearer xyz", cookie: "session=abc", "user-agent": "test" },
      },
    } as unknown as ErrorEvent;

    const result = scrubSensitiveData(event);

    expect(result.request?.cookies).toBeUndefined();
    expect(result.request?.data).toBeUndefined();
    expect(result.request?.headers?.authorization).toBeUndefined();
    expect(result.request?.headers?.cookie).toBeUndefined();
    expect(result.request?.headers?.["user-agent"]).toBe("test");
  });

  it("scrubs sensitive keys out of extra and contexts", () => {
    const event = {
      extra: { stripeSecretKey: "sk_live_abc", bookingId: "bk-1" },
      contexts: { payment: { cardNumber: "4242424242424242" } },
    } as unknown as ErrorEvent;

    const result = scrubSensitiveData(event);

    expect((result.extra as Record<string, unknown>).stripeSecretKey).toBe("[Filtered]");
    expect((result.extra as Record<string, unknown>).bookingId).toBe("bk-1");
    expect((result.contexts as { payment: { cardNumber: string } }).payment.cardNumber).toBe("[Filtered]");
  });

  it("handles an event with no request/extra/contexts without throwing", () => {
    const event = { message: "plain error" } as ErrorEvent;
    expect(() => scrubSensitiveData(event)).not.toThrow();
    expect(scrubSensitiveData(event).message).toBe("plain error");
  });
});
