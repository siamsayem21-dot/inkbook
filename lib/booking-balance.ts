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
