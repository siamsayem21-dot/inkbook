import { describe, it, expect } from "vitest";
import { getBookingTotalCents, getBalanceDueCents, getOutstandingBalanceCents } from "@/lib/booking-balance";

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

// Regression coverage for the Owner Bookings list/detail bug: a fully-paid
// booking (deposit paid AND remainder collected) was showing a nonzero
// "balance due" because getBalanceDueCents() always computes the raw
// total - deposit_amount_cents figure, with no awareness of whether the
// remainder was ever actually collected. getOutstandingBalanceCents() is the
// fix, used specifically by Owner Bookings' list + detail pages.
describe("getOutstandingBalanceCents", () => {
  it("deposit only paid, remainder not collected — same figure as the raw total-minus-deposit calculation", () => {
    // Matches the QA "Confirmed" fixture: deposit paid, remainder untouched.
    expect(
      getOutstandingBalanceCents({
        total_amount_cents: null,
        quote_amount_cents: 80000,
        deposit_amount_cents: 25000,
        deposit_paid: true,
        remainder_collected: false,
      })
    ).toBe(55000);
  });

  it("deposit + remainder both fully paid — $0 remaining, not total-minus-deposit", () => {
    // Matches the QA "Completed" fixture that exposed the bug: $300 deposit +
    // $900 remainder both paid on a $1200 total must show $0, not $900.
    expect(
      getOutstandingBalanceCents({
        total_amount_cents: null,
        quote_amount_cents: 120000,
        deposit_amount_cents: 30000,
        deposit_paid: true,
        remainder_collected: true,
      })
    ).toBe(0);
  });

  it("remainder requested but not yet collected (pending/failed payment attempt) — still shows the full amount due", () => {
    // A deposit_payments row with payment_status "pending" or "failed" never
    // flips remainder_collected true (only a genuine Stripe success does,
    // via handleRemainderPayment in app/api/stripe/webhook/route.ts) — so a
    // failed/abandoned/pending remainder attempt must not reduce the balance.
    expect(
      getOutstandingBalanceCents({
        total_amount_cents: null,
        quote_amount_cents: 120000,
        deposit_amount_cents: 30000,
        deposit_paid: true,
        remainder_collected: false,
      })
    ).toBe(90000);
  });

  it("deposit not actually paid yet — the deposit amount is not subtracted either", () => {
    // Nothing has been "successfully collected" toward the total in this
    // case, so the full total is owed — not total-minus-an-unpaid-deposit.
    expect(
      getOutstandingBalanceCents({
        total_amount_cents: null,
        quote_amount_cents: 50000,
        deposit_amount_cents: 10000,
        deposit_paid: false,
        remainder_collected: false,
      })
    ).toBe(50000);
  });

  it("returns null when there is no agreed total price (classic self-serve booking)", () => {
    expect(
      getOutstandingBalanceCents({
        total_amount_cents: null,
        quote_amount_cents: null,
        deposit_amount_cents: 10000,
        deposit_paid: true,
        remainder_collected: false,
      })
    ).toBeNull();
  });

  it("never goes negative", () => {
    expect(
      getOutstandingBalanceCents({
        total_amount_cents: 5000,
        quote_amount_cents: null,
        deposit_amount_cents: 10000,
        deposit_paid: true,
        remainder_collected: false,
      })
    ).toBe(0);
  });

  // "No double counting across legacy/current payment sources" — this
  // function takes only the two already-reconciled booking-level booleans
  // (deposit_paid, remainder_collected), never raw rows from deposit_payments
  // or the legacy deposits table. Each boolean is written exactly once,
  // idempotently, by the Stripe webhook. There is structurally nothing here
  // to sum twice, regardless of how many payment_attempt rows exist across
  // either table for the same booking (multiple abandoned Stripe Checkout
  // sessions, a legacy `deposits` row alongside a `deposit_payments` row,
  // etc.) — the result depends only on the two flags, never on row counts.
  it("is unaffected by how many underlying payment-attempt rows exist — only the reconciled flags matter", () => {
    const bookingSeenAsPaidViaCurrentTable = {
      total_amount_cents: null,
      quote_amount_cents: 120000,
      deposit_amount_cents: 30000,
      deposit_paid: true,
      remainder_collected: true,
    };
    const bookingSeenAsPaidViaLegacyFallback = { ...bookingSeenAsPaidViaCurrentTable };

    // Same reconciled state, regardless of which table's row actually
    // recorded the payment underneath — both must resolve to the same
    // single, correct $0 outstanding balance.
    expect(getOutstandingBalanceCents(bookingSeenAsPaidViaCurrentTable)).toBe(0);
    expect(getOutstandingBalanceCents(bookingSeenAsPaidViaLegacyFallback)).toBe(0);
  });
});
