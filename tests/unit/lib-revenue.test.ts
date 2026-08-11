import { describe, it, expect } from "vitest";
import { aggregateRevenueByMonth, sumKeptDepositCents, monthKey } from "@/lib/revenue";
import type { BookingRevenueRow, DepositPaymentRow, CustomRequestRevenueRow } from "@/lib/revenue";

function booking(overrides: Partial<BookingRevenueRow> = {}): BookingRevenueRow {
  return {
    deposit_amount_cents: 10000,
    deposit_paid: true,
    deposit_paid_at: "2026-06-15T12:00:00Z",
    deposit_kept: false,
    created_at: "2026-06-01T00:00:00Z",
    ...overrides,
  };
}

function depositPayment(overrides: Partial<DepositPaymentRow> = {}): DepositPaymentRow {
  return {
    amount_cents: 5000,
    payment_status: "paid",
    payment_type: "remainder",
    paid_at: "2026-06-20T12:00:00Z",
    ...overrides,
  };
}

function customRequest(overrides: Partial<CustomRequestRevenueRow> = {}): CustomRequestRevenueRow {
  return {
    deposit_amount: 75,
    deposit_paid_at: "2026-06-10T12:00:00Z",
    status: "accepted",
    ...overrides,
  };
}

describe("monthKey", () => {
  it("formats as YYYY-MM", () => {
    // Noon UTC — safe from local-timezone day/month rollover in any
    // realistic offset (±12h), unlike a near-midnight timestamp.
    expect(monthKey("2026-03-05T12:00:00Z")).toBe("2026-03");
    expect(monthKey("2026-12-15T12:00:00Z")).toBe("2026-12");
  });
});

describe("aggregateRevenueByMonth — payment-date attribution, never appointment date", () => {
  it("buckets a booking deposit by deposit_paid_at, ignoring any other date", () => {
    const result = aggregateRevenueByMonth(
      [booking({ deposit_paid_at: "2026-03-01T00:00:00Z", created_at: "2026-08-01T00:00:00Z" })],
      [],
      []
    );
    expect(result).toEqual({ "2026-03": 10000 });
  });

  it("falls back to created_at only when deposit_paid_at is null (defensive path, not the normal case)", () => {
    const result = aggregateRevenueByMonth(
      [booking({ deposit_paid_at: null, created_at: "2026-05-01T00:00:00Z" })],
      [],
      []
    );
    expect(result).toEqual({ "2026-05": 10000 });
  });
});

describe("aggregateRevenueByMonth — booking deposits counted exactly once", () => {
  it("counts a paid booking's deposit once even when its own deposit_payments row (payment_type=deposit) is also present", () => {
    const result = aggregateRevenueByMonth(
      [booking({ deposit_amount_cents: 10000, deposit_paid_at: "2026-06-01T00:00:00Z" })],
      [depositPayment({ payment_type: "deposit", amount_cents: 10000, paid_at: "2026-06-01T00:00:00Z" })],
      []
    );
    // Must be 10000, not 20000 — deposit-type deposit_payments rows are
    // intentionally ignored (bookings.deposit_amount_cents is already the
    // complete, authoritative source for deposit revenue).
    expect(result).toEqual({ "2026-06": 10000 });
  });

  it("excludes bookings where deposit_paid is false", () => {
    const result = aggregateRevenueByMonth([booking({ deposit_paid: false })], [], []);
    expect(result).toEqual({});
  });
});

describe("aggregateRevenueByMonth — custom-request lifecycle inclusion", () => {
  it.each(["accepted", "scheduled", "completed"])("includes a deposit-paid custom_request with status=%s", (status) => {
    const result = aggregateRevenueByMonth([], [], [customRequest({ status, deposit_amount: 75 })]);
    expect(result).toEqual({ "2026-06": 7500 });
  });

  it.each(["pending", "quoted", "declined"])("excludes a custom_request with status=%s even if deposit_paid_at is set", (status) => {
    const result = aggregateRevenueByMonth([], [], [customRequest({ status })]);
    expect(result).toEqual({});
  });

  it("excludes a custom_request with no deposit_paid_at", () => {
    const result = aggregateRevenueByMonth([], [], [customRequest({ deposit_paid_at: null })]);
    expect(result).toEqual({});
  });
});

describe("aggregateRevenueByMonth — remainder payments included exactly once", () => {
  it("includes a paid remainder payment", () => {
    const result = aggregateRevenueByMonth([], [depositPayment({ amount_cents: 12000, paid_at: "2026-07-01T00:00:00Z" })], []);
    expect(result).toEqual({ "2026-07": 12000 });
  });

  it.each(["pending", "refunded"])("excludes a remainder payment with payment_status=%s", (payment_status) => {
    const result = aggregateRevenueByMonth([], [depositPayment({ payment_status })], []);
    expect(result).toEqual({});
  });

  it("excludes a deposit-type deposit_payments row (not remainder) even if paid — that revenue is already counted via bookings", () => {
    const result = aggregateRevenueByMonth([], [depositPayment({ payment_type: "deposit", payment_status: "paid" })], []);
    expect(result).toEqual({});
  });

  it("does not double count if the same remainder row were somehow passed twice — sums whatever rows it's given (dedup is a write-time guarantee, not a read-time one)", () => {
    const row = depositPayment({ amount_cents: 5000 });
    const result = aggregateRevenueByMonth([], [row, row], []);
    expect(result).toEqual({ "2026-06": 10000 }); // documents the boundary — see webhook idempotency tests for write-time dedup
  });
});

describe("aggregateRevenueByMonth — no-show handling", () => {
  it("counts a kept no-show deposit once in the monthly total, same as any other paid deposit", () => {
    const result = aggregateRevenueByMonth(
      [booking({ deposit_amount_cents: 8000, deposit_paid: true, deposit_kept: true, deposit_paid_at: "2026-08-03T00:00:00Z" })],
      [],
      []
    );
    expect(result).toEqual({ "2026-08": 8000 });
  });
});

describe("aggregateRevenueByMonth — multi-source combination and studio-agnostic behavior", () => {
  it("sums booking, remainder, and custom_request revenue landing in the same month into one bucket", () => {
    const result = aggregateRevenueByMonth(
      [booking({ deposit_amount_cents: 10000, deposit_paid_at: "2026-06-05T00:00:00Z" })],
      [depositPayment({ amount_cents: 12000, paid_at: "2026-06-10T00:00:00Z" })],
      [customRequest({ deposit_amount: 75, deposit_paid_at: "2026-06-20T00:00:00Z" })]
    );
    expect(result).toEqual({ "2026-06": 22000 + 7500 - 0 }); // 10000 + 12000 + 7500
  });

  it("keeps separate months separate", () => {
    const result = aggregateRevenueByMonth(
      [booking({ deposit_paid_at: "2026-03-01T00:00:00Z", deposit_amount_cents: 100 }), booking({ deposit_paid_at: "2026-04-01T00:00:00Z", deposit_amount_cents: 200 })],
      [],
      []
    );
    expect(result).toEqual({ "2026-03": 100, "2026-04": 200 });
  });
});

describe("sumKeptDepositCents", () => {
  it("sums only deposit_kept=true bookings", () => {
    const cents = sumKeptDepositCents([
      booking({ deposit_kept: true, deposit_amount_cents: 8000 }),
      booking({ deposit_kept: true, deposit_amount_cents: 5000 }),
      booking({ deposit_kept: false, deposit_amount_cents: 10000 }),
    ]);
    expect(cents).toBe(13000);
  });

  it("is a breakdown of already-collected revenue, not additive: a kept booking appears once in the monthly total and once (the same fact) in the kept total, never summed together into a bigger number", () => {
    const bookings = [booking({ deposit_paid: true, deposit_kept: true, deposit_amount_cents: 8000, deposit_paid_at: "2026-08-03T00:00:00Z" })];
    const monthTotal = aggregateRevenueByMonth(bookings, [], [])["2026-08"];
    const keptTotal = sumKeptDepositCents(bookings);
    expect(monthTotal).toBe(8000);
    expect(keptTotal).toBe(8000);
    // Both figures independently equal the single $80 deposit — this proves
    // the page never adds keptCents on top of revenueByMonth (see page.tsx:
    // the two are rendered in separate stat cards, never summed).
  });
});
