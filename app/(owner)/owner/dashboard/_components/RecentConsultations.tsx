import Link from "next/link";
import { getStage, type LeadStatus } from "@/lib/pipeline";

export interface RecentConsultation {
  id: string;
  clientName: string;
  status: string;
  createdAtLabel: string;
  artistName: string | null;
}

// Light-theme counterpart to PIPELINE_STAGES' dark badge classes (lib/pipeline.ts
// only defines dark-mode colors, e.g. "bg-blue-500/10 text-blue-400" — not usable
// on a white card).
const LIGHT_STAGE_BADGE: Record<LeadStatus, string> = {
  new:           "bg-blue-50 text-blue-700",
  reviewed:      "bg-yellow-50 text-yellow-700",
  quoted:        "bg-amber-50 text-amber-700",
  booked:        "bg-emerald-50 text-emerald-700",
  deposit_paid:  "bg-violet-50 text-violet-700",
  completed:     "bg-green-50 text-green-700",
  lost:          "bg-zinc-100 text-zinc-500",
};

export default function RecentConsultations({ items }: { items: RecentConsultation[] }) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-zinc-900">Recent consultations</h2>
        <Link href="/owner/consultations" className="text-xs font-medium text-violet-600 hover:text-violet-700">
          View all →
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-zinc-400 text-center py-10 flex-1">No AI consultations submitted yet.</p>
      ) : (
        <div className="flex-1 divide-y divide-zinc-100">
          {items.map((c) => {
            const stage = getStage(c.status);
            return (
              <Link
                key={c.id}
                href={`/owner/consultations/${c.id}`}
                className="flex items-center gap-3 py-2.5 hover:bg-zinc-50 transition-colors -mx-1 px-1 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">{c.clientName}</p>
                  <p className="text-xs text-zinc-500 truncate">
                    {c.artistName ?? "Not yet assigned"} · {c.createdAtLabel}
                  </p>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${LIGHT_STAGE_BADGE[stage.value]}`}>
                  {stage.label}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
