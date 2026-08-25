// Client-facing status labels for tattoo projects — deliberately different wording
// from the owner-side pipeline (lib/pipeline.ts), which is written for studio staff.
// "converted" and "lost" are legacy/internal statuses that still need a safe
// client-facing fallback if a client ever sees one.
export const PROJECT_STATUS_META: Record<string, { label: string; badge: string }> = {
  new:          { label: "Consultation Submitted", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  reviewed:     { label: "Under Review",            badge: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  quoted:       { label: "Quote Ready",              badge: "bg-amber-50 text-amber-700 border-amber-200" },
  deposit_paid: { label: "Deposit Pending",          badge: "bg-violet-50 text-violet-700 border-violet-200" },
  booked:       { label: "Booking Confirmed",        badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  completed:    { label: "Completed",                badge: "bg-green-50 text-green-700 border-green-200" },
  converted:    { label: "Completed",                badge: "bg-green-50 text-green-700 border-green-200" },
  lost:         { label: "Consultation Submitted",   badge: "bg-zinc-100 text-zinc-500 border-zinc-200" },
};

export function getProjectStatusMeta(status: string) {
  return PROJECT_STATUS_META[status] ?? PROJECT_STATUS_META.new;
}
