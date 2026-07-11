// Client-facing status labels for tattoo projects — deliberately different wording
// from the owner-side pipeline (lib/pipeline.ts), which is written for studio staff.
// "converted" and "lost" are legacy/internal statuses that still need a safe
// client-facing fallback if a client ever sees one.
export const PROJECT_STATUS_META: Record<string, { label: string; badge: string }> = {
  new:          { label: "Consultation Submitted", badge: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  reviewed:     { label: "Under Review",            badge: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  quoted:       { label: "Quote Ready",              badge: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  deposit_paid: { label: "Deposit Pending",          badge: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  booked:       { label: "Booking Confirmed",        badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  completed:    { label: "Completed",                badge: "bg-green-500/10 text-green-400 border-green-500/20" },
  converted:    { label: "Completed",                badge: "bg-green-500/10 text-green-400 border-green-500/20" },
  lost:         { label: "Consultation Submitted",   badge: "bg-zinc-500/10 text-zinc-400 border-zinc-700" },
};

export function getProjectStatusMeta(status: string) {
  return PROJECT_STATUS_META[status] ?? PROJECT_STATUS_META.new;
}
