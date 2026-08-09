import Link from "next/link";
import type { LeadStatus } from "@/lib/pipeline";

interface Props {
  stageCounts: Record<string, number>;
  total: number;
}

// Dashboard-only display order/subset: New → Reviewed → Quoted → Deposit Paid → Booked
// (Completed/Lost are terminal — omitted here to keep this a "what's still moving"
// snapshot). This is a local presentational choice only — it does NOT reorder
// lib/pipeline.ts's PIPELINE_STAGES (whose order is "quoted → booked → deposit_paid →
// completed" and is shared with /owner/pipeline's board and /owner/consultations'
// filters, neither of which this change touches).
const DASHBOARD_STAGES: { value: LeadStatus; label: string }[] = [
  { value: "new",           label: "New" },
  { value: "reviewed",      label: "Reviewed" },
  { value: "quoted",        label: "Quoted" },
  { value: "deposit_paid",  label: "Deposit Paid" },
  { value: "booked",        label: "Booked" },
];

// Always-all-time snapshot ("where's everything sitting right now"), independent of
// the dashboard's period control — matches /owner/pipeline, which this links to.
export default function LeadPipelineOverview({ stageCounts, total }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">Lead pipeline overview</h2>
          <p className="text-xs text-zinc-400 mt-0.5">{total} total lead{total === 1 ? "" : "s"} · consultations + custom requests</p>
        </div>
        <Link href="/owner/pipeline" className="text-xs font-medium text-violet-600 hover:text-violet-700 shrink-0">
          Full pipeline →
        </Link>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {DASHBOARD_STAGES.map((s, i) => (
          <div key={s.value} className="relative rounded-xl border border-zinc-100 px-2 py-3.5 text-center">
            <p className="text-xl font-bold text-zinc-900 tabular-nums">{stageCounts[s.value] ?? 0}</p>
            <p className="text-[9px] uppercase tracking-widest text-zinc-400 mt-1 leading-tight">{s.label}</p>
            {i < DASHBOARD_STAGES.length - 1 && (
              <span className="hidden sm:block absolute top-1/2 -right-2.5 -translate-y-1/2 text-zinc-300 text-xs">→</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
