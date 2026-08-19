// `bookings` has no per-session duration column (only `date` + `time`), so
// true duration-aware overlap detection isn't possible without a migration
// (prepared separately — see DEFERRED_ISSUES.md #11). Until that lands,
// this is the smallest safe V1 improvement over an exact-time-only match:
// treat any two active bookings for the same artist on the same day as
// conflicting if they start within this many minutes of each other, on the
// assumption a tattoo session commonly runs several hours. Deliberately
// conservative (a false-positive "slot taken" is a minor inconvenience an
// owner/artist can override by hand; a missed real conflict is not).
export const BOOKING_CONFLICT_BUFFER_MINUTES = 240; // 4 hours

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/** True if two same-day appointment times are close enough to likely overlap. */
export function isWithinConflictBuffer(existingTime: string, requestedTime: string): boolean {
  return Math.abs(timeToMinutes(existingTime) - timeToMinutes(requestedTime)) < BOOKING_CONFLICT_BUFFER_MINUTES;
}

/** True if `date` (YYYY-MM-DD) is one of the artist's marked days off. */
export function isDateUnavailable(unavailableDates: string[] | null | undefined, date: string): boolean {
  return (unavailableDates ?? []).includes(date);
}
