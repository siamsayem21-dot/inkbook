// Owner Revenue module — pure aggregation logic, kept separate from the
// server component so calculation correctness can be unit tested without a
// live DB. Every function takes UNFILTERED rows and does its own
// paid/eligible filtering, so tests can prove pending/failed/expired rows
// are correctly excluded rather than just trusting a caller to pre-filter.

export interface BookingRevenueRow {
  deposit_amount_cents: number;
  deposit_paid: boolean;
  deposit_paid_at: string | null;
  deposit_kept: boolean;
  created_at: string;
}

export interface DepositPaymentRow {
  amount_cents: number;
  payment_status: string; // "pending" | "paid" | "refunded" | "kept"
  payment_type: string;   // "deposit" | "remainder"
  paid_at: string | null;
}

export interface CustomRequestRevenueRow {
  deposit_amount: number | null;
  deposit_paid_at: string | null;
  status: string;
}

const REVENUE_ELIGIBLE_CR_STATUSES = new Set(["accepted", "scheduled", "completed"]);

export function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Buckets every revenue source into a single { "YYYY-MM": cents } map,
 * keyed by when the money actually landed (deposit_paid_at / paid_at) —
 * never by an unrelated date like a booking's appointment date.
 *
 * - Booking deposits: counted once per booking (deposit_paid=true only).
 * - Remainder payments: sourced only from deposit_payments (the only place
 *   the dollar amount is stored), payment_type="remainder" AND
 *   payment_status="paid" only — pending/refunded/kept rows excluded.
 * - Custom-request deposits: counted once per request, for any status past
 *   "quoted" that hasn't been declined (accepted/scheduled/completed) —
 *   the deposit-paid lifecycle continues past "accepted".
 *
 * Duplicate-write protection (a Stripe webhook retry re-marking the same
 * row "paid" twice, or inserting a second row for the same payment) is
 * enforced upstream at write time (UNIQUE stripe_payment_intent_id +
 * update-existing-row-not-insert webhook handlers) — this function simply
 * sums whatever rows are marked paid, by design.
 */
export function aggregateRevenueByMonth(
  bookings: BookingRevenueRow[],
  depositPayments: DepositPaymentRow[],
  customRequests: CustomRequestRevenueRow[]
): Record<string, number> {
  const revenueByMonth: Record<string, number> = {};
  const add = (iso: string | null, cents: number) => {
    if (!iso || !cents) return;
    const key = monthKey(iso);
    revenueByMonth[key] = (revenueByMonth[key] ?? 0) + cents;
  };

  for (const b of bookings) {
    if (b.deposit_paid) add(b.deposit_paid_at ?? b.created_at, b.deposit_amount_cents ?? 0);
  }
  for (const p of depositPayments) {
    if (p.payment_type === "remainder" && p.payment_status === "paid") add(p.paid_at, p.amount_cents ?? 0);
  }
  for (const cr of customRequests) {
    if (REVENUE_ELIGIBLE_CR_STATUSES.has(cr.status)) add(cr.deposit_paid_at, Math.round((cr.deposit_amount ?? 0) * 100));
  }

  return revenueByMonth;
}

/** Lifetime total of deposits retained on no-shows — an informational
 *  breakdown of already-collected revenue, not an additional amount. */
export function sumKeptDepositCents(bookings: BookingRevenueRow[]): number {
  return bookings.filter((b) => b.deposit_kept).reduce((s, b) => s + (b.deposit_amount_cents ?? 0), 0);
}
