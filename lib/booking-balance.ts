// Single source of truth for "the total agreed price" and "what's still
// owed" on a booking (Phase C Feature 2). The total price lives in one of
// two mutually-exclusive, historically separate columns depending on which
// flow created the booking:
//   - bookings.total_amount_cents  — set by continueToDeposit() (client
//     portal quote flow) and the process_custom_request_deposit RPC.
//   - bookings.quote_amount_cents  — set by bookConsultation() (owner-driven
//     AI-consultation booking flow). Written but never read anywhere before
//     this feature.
// A booking never has both populated (the two creation paths are disjoint),
// so coalescing is safe. Bookings created via the classic self-serve flow
// (POST /api/bookings) have neither — there is no agreed total price for
// those, so both functions return null rather than guessing.
export type BookingPriceFields = {
  total_amount_cents: number | null;
  quote_amount_cents: number | null;
  deposit_amount_cents: number;
};

export function getBookingTotalCents(booking: BookingPriceFields): number | null {
  return booking.total_amount_cents ?? booking.quote_amount_cents ?? null;
}

export function getBalanceDueCents(booking: BookingPriceFields): number | null {
  const total = getBookingTotalCents(booking);
  if (total === null) return null;
  return Math.max(total - booking.deposit_amount_cents, 0);
}

// "What's still actually owed right now" — unlike getBalanceDueCents() above
// (always total - deposit_amount_cents, regardless of collection state),
// this respects deposit_paid / remainder_collected: the two booleans the
// Stripe webhook (handleDepositPayment / handleRemainderPayment in
// app/api/stripe/webhook/route.ts) writes exactly once each, idempotently,
// only on a genuine successful payment — never on pending/failed/expired
// attempts. Using these already-reconciled flags (rather than re-summing
// deposit_payments and/or the legacy deposits table here) is what avoids
// double-counting across that dual payment-history setup: this function
// never reads either payments table itself, so there is nothing to sum
// twice. A booking whose remainder has been collected owes nothing further,
// no matter what the raw total/deposit arithmetic would otherwise suggest;
// a booking whose deposit hasn't actually been marked paid yet has not had
// anything "successfully collected" toward its total yet either.
//
// Deliberately a separate function rather than changing getBalanceDueCents()
// itself: getBalanceDueCents() is also used by call sites that legitimately
// want "the raw remainder amount" regardless of collection status — the
// Stripe webhook's post-payment receipt email (reports what was just paid,
// called after remainder_collected has already flipped true) and the
// payment-reminders cron (already query-filters to remainder_collected =
// false, so the raw figure is correct there too). Only Owner Bookings
// (list + detail) needs "what's outstanding right now" semantics.
export type BookingPaymentState = BookingPriceFields & {
  deposit_paid: boolean;
  remainder_collected: boolean;
};

export function getOutstandingBalanceCents(booking: BookingPaymentState): number | null {
  const total = getBookingTotalCents(booking);
  if (total === null) return null;
  if (booking.remainder_collected) return 0;
  const collectedTowardTotal = booking.deposit_paid ? booking.deposit_amount_cents : 0;
  return Math.max(total - collectedTowardTotal, 0);
}
