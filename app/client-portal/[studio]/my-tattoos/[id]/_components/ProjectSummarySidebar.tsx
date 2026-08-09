import PrimaryActionButton from "./PrimaryActionButton";
import type { ProjectDetailData } from "../types";

interface Props {
  project: ProjectDetailData;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-xs text-zinc-400">{label}</span>
      <span className="text-sm font-medium text-zinc-800 text-right">{value}</span>
    </div>
  );
}

export default function ProjectSummarySidebar({ project }: Props) {
  return (
    <div className="lg:sticky lg:top-24 bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
      <h2 className="text-base font-semibold text-zinc-900 mb-1">Project Summary</h2>
      <div className="divide-y divide-zinc-100">
        <Row label="Project Status" value={project.statusLabel} />
        <Row label="Current Stage" value={project.currentStageLabel} />
        <Row label="Next Step" value={project.nextStepLabel} />
        <Row label="Artist" value={project.artist?.name ?? "Pending Assignment"} />
        <Row label="Appointment" value={project.appointment?.dateLabel ? `${project.appointment.dateLabel}${project.appointment.timeLabel ? ` · ${project.appointment.timeLabel}` : ""}` : "Not scheduled"} />
        <Row label={project.quote?.finalPriceLabel ? "Final Price" : "Estimated Price"} value={project.headlinePriceLabel} />
        <Row label="Deposit Status" value={project.deposit?.statusLabel ?? "Not required yet"} />
        <Row label="Last Updated" value={project.lastUpdatedLabel} />
      </div>

      {project.primaryAction.kind !== "none" && (
        <div className="mt-5 pt-5 border-t border-zinc-100">
          <PrimaryActionButton action={project.primaryAction} compact />
        </div>
      )}
    </div>
  );
}
