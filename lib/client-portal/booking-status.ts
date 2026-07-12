// Client-facing status labels for a booking (bookings.status), mirroring the
// shape and tone of lib/client-portal/project-status.ts's PROJECT_STATUS_META.
// "completed" is included for forward-compatibility even though no code path
// in the app currently sets it (see the "My Bookings" plan's §7) — every
// existing owner/artist status-badge map carries the same unreachable entry.
export const BOOKING_STATUS_META: Record<string, { label: string; badge: string }> = {
  pending_deposit:   { label: "Awaiting Deposit",   badge: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  awaiting_schedule: { label: "Deposit Paid",       badge: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  confirmed:         { label: "Confirmed",          badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  completed:         { label: "Completed",          badge: "bg-green-500/10 text-green-400 border-green-500/20" },
  cancelled:         { label: "Cancelled",          badge: "bg-zinc-500/10 text-zinc-400 border-zinc-700" },
  no_show:           { label: "No-Show",            badge: "bg-red-500/10 text-red-400 border-red-500/20" },
};

export function getBookingStatusMeta(status: string) {
  return BOOKING_STATUS_META[status] ?? { label: status, badge: "bg-zinc-500/10 text-zinc-400 border-zinc-700" };
}
