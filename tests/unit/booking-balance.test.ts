import { describe, it, expect } from "vitest";
import { getBookingTotalCents, getBalanceDueCents } from "@/lib/booking-balance";

describe("getBookingTotalCents", () => {
  it("prefers total_amount_cents when both are set (should never happen in practice)", () => {
    expect(getBookingTotalCents({ total_amount_cents: 50000, quote_amount_cents: 40000, deposit_amount_cents: 10000 })).toBe(50000);
  });

  it("falls back to quote_amount_cents (bookConsultation()-sourced bookings)", () => {
    expect(getBookingTotalCents({ total_amount_cents: null, quote_amount_cents: 50000, deposit_amount_cents: 10000 })).toBe(50000);
  });

  it("returns null when neither is set (classic self-serve bookings)", () => {
    expect(getBookingTotalCents({ total_amount_cents: null, quote_amount_cents: null, deposit_amount_cents: 10000 })).toBeNull();
  });
});

describe("getBalanceDueCents", () => {
  it("computes total minus deposit", () => {
    expect(getBalanceDueCents({ total_amount_cents: 50000, quote_amount_cents: null, deposit_amount_cents: 10000 })).toBe(40000);
  });

  it("uses quote_amount_cents when total_amount_cents is absent", () => {
    expect(getBalanceDueCents({ total_amount_cents: null, quote_amount_cents: 30000, deposit_amount_cents: 10000 })).toBe(20000);
  });

  it("returns null when no total price is known", () => {
    expect(getBalanceDueCents({ total_amount_cents: null, quote_amount_cents: null, deposit_amount_cents: 10000 })).toBeNull();
  });

  it("never goes negative (deposit somehow exceeds total)", () => {
    expect(getBalanceDueCents({ total_amount_cents: 5000, quote_amount_cents: null, deposit_amount_cents: 10000 })).toBe(0);
  });

  it("returns 0 when deposit exactly equals total", () => {
    expect(getBalanceDueCents({ total_amount_cents: 10000, quote_amount_cents: null, deposit_amount_cents: 10000 })).toBe(0);
  });
});
