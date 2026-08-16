import Link from "next/link";

// Same 6-state mapping as the locked app/(owner)/owner/requests/[id]/page.tsx —
// kept verbatim for color/label consistency across Owner and Artist Portal.
const STATUS_META: Record<string, { label: string; badge: string }> = {
  pending:   { label: "Pending Review",              badge: "bg-amber-50 text-amber-700" },
  quoted:    { label: "Approved — Awaiting Deposit",  badge: "bg-violet-50 text-violet-700" },
  accepted:  { label: "Deposit Paid",                 badge: "bg-emerald-50 text-emerald-700" },
  scheduled: { label: "Scheduled",                    badge: "bg-sky-50 text-sky-700" },
  declined:  { label: "Declined",                     badge: "bg-zinc-100 text-zinc-500" },
  completed: { label: "Completed",                    badge: "bg-green-50 text-green-700" },
};

interface Props {
  requestId?: string;
  clientName?: string;
  style?: string | null;
  budgetRange?: string;
  date?: string;
  status?: string;
  assignedToMe?: boolean;
}

export default function RequestCard({
  requestId = "—",
  clientName = "Client name",
  style = null,
  budgetRange = "",
  date = "",
  status = "pending",
  assignedToMe = false,
}: Props) {
  const meta = STATUS_META[status] ?? { label: status, badge: "bg-zinc-100 text-zinc-500" };

  return (
    <Link
      href={`/artist/requests/${requestId}`}
      className="block bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 hover:border-violet-200 transition-colors"
    >
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="font-semibold text-sm text-zinc-900 truncate">{clientName}</p>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${meta.badge}`}>
              {meta.label}
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                assignedToMe ? "bg-violet-50 text-violet-700" : "bg-zinc-100 text-zinc-500"
              }`}
            >
              {assignedToMe ? "Assigned to you" : "Unassigned"}
            </span>
          </div>
          <p className="text-zinc-500 text-xs">
            {date}
            {style ? ` · ${style}` : ""}
            {budgetRange ? ` · ${budgetRange}` : ""}
          </p>
        </div>
        <span className="text-xs text-violet-600 font-medium shrink-0">View →</span>
      </div>
    </Link>
  );
}
