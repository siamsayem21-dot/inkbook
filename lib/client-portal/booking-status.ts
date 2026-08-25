// Client-facing status labels for a booking (bookings.status), mirroring the
// shape and tone of lib/client-portal/project-status.ts's PROJECT_STATUS_META.
// "completed" is included for forward-compatibility even though no code path
// in the app currently sets it (see the "My Bookings" plan's §7) — every
// existing owner/artist status-badge map carries the same unreachable entry.
export const BOOKING_STATUS_META: Record<string, { label: string; badge: string }> = {
  pending_deposit:   { label: "Awaiting Deposit",   badge: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  awaiting_schedule: { label: "Deposit Paid",       badge: "bg-violet-50 text-violet-700 border-violet-200" },
  confirmed:         { label: "Confirmed",          badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  completed:         { label: "Completed",          badge: "bg-green-50 text-green-700 border-green-200" },
  cancelled:         { label: "Cancelled",          badge: "bg-zinc-100 text-zinc-500 border-zinc-200" },
  no_show:           { label: "No-Show",            badge: "bg-red-50 text-red-700 border-red-200" },
};

export function getBookingStatusMeta(status: string) {
  return BOOKING_STATUS_META[status] ?? { label: status, badge: "bg-zinc-100 text-zinc-500 border-zinc-200" };
}
