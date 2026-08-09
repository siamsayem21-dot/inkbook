import { Clock, FileText, ChevronRight } from "lucide-react";

interface Props {
  currentProjectTitle: string;
  currentProjectStatus: string;
  pastTattoosCount: number;
}

export default function MyTattoosCard({ currentProjectTitle, currentProjectStatus, pastTattoosCount }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 h-full">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-zinc-900">My Tattoos</h2>
        <span title="Coming soon" className="text-xs font-medium text-zinc-300 cursor-not-allowed select-none">
          View all
        </span>
      </div>

      <div className="space-y-2.5">
        <div title="Coming soon" className="flex items-center gap-3.5 rounded-xl border border-zinc-100 p-3.5 cursor-not-allowed">
          <span className="w-10 h-10 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
            <Clock size={17} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-900">Current Project</p>
            <p className="text-xs text-zinc-500 truncate mt-0.5">{currentProjectTitle}</p>
          </div>
          <span className="text-[11px] font-medium text-violet-700 bg-violet-50 px-2.5 py-1 rounded-full whitespace-nowrap">
            {currentProjectStatus}
          </span>
          <ChevronRight size={16} className="text-zinc-300 shrink-0" />
        </div>

        <div title="Coming soon" className="flex items-center gap-3.5 rounded-xl border border-zinc-100 p-3.5 cursor-not-allowed">
          <span className="w-10 h-10 rounded-lg bg-zinc-100 text-zinc-500 flex items-center justify-center shrink-0">
            <FileText size={17} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-900">Past Tattoos</p>
            <p className="text-xs text-zinc-500 mt-0.5">{pastTattoosCount} Completed</p>
          </div>
          <ChevronRight size={16} className="text-zinc-300 shrink-0" />
        </div>
      </div>
    </div>
  );
}
