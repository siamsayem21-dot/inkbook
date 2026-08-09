import { XCircle } from "lucide-react";
import PrimaryActionButton from "./PrimaryActionButton";
import type { ProjectDetailData } from "../types";

interface Props {
  project: ProjectDetailData;
}

export default function ProjectHeader({ project }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 sm:p-7">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-1.5">
        <h1 className="text-[28px] leading-tight font-bold text-zinc-900">{project.title}</h1>
        <span className="text-[11px] font-medium text-violet-700 bg-violet-50 px-2.5 py-1 rounded-full whitespace-nowrap mt-1.5">
          {project.statusLabel}
        </span>
      </div>
      <p className="text-sm text-zinc-500 mb-6">
        {project.style} · {project.placement}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4 mb-6">
        <div>
          <p className="text-xs text-zinc-400">Artist</p>
          {project.artist ? (
            <p className="text-sm font-medium text-zinc-800 mt-0.5">{project.artist.name}</p>
          ) : (
            <p className="text-sm font-medium text-zinc-600 flex items-center gap-1.5 mt-0.5">
              <XCircle size={13} className="text-zinc-300" />
              Pending Assignment
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-zinc-400">{project.quote?.finalPriceLabel ? "Final Price" : "Estimated Price"}</p>
          <p className="text-sm font-medium text-zinc-800 mt-0.5">{project.headlinePriceLabel}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-400">Next Step</p>
          <p className="text-sm font-medium text-zinc-800 mt-0.5">{project.nextStepLabel}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-400">Last Updated</p>
          <p className="text-sm font-medium text-zinc-800 mt-0.5">{project.lastUpdatedLabel}</p>
        </div>
      </div>

      <PrimaryActionButton action={project.primaryAction} />
    </div>
  );
}
