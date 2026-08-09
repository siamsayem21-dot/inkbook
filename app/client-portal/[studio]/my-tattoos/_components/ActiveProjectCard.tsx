import Link from "next/link";
import { ImageOff, XCircle } from "lucide-react";
import type { ActiveTattooProject } from "../types";

interface Props {
  project: ActiveTattooProject;
}

function Field({ label, value, pending }: { label: string; value: string; pending?: boolean }) {
  return (
    <div>
      <p className="text-xs text-zinc-400">{label}</p>
      {pending ? (
        <p className="text-sm font-medium text-zinc-600 flex items-center gap-1.5 mt-0.5">
          <XCircle size={13} className="text-zinc-300" />
          {value}
        </p>
      ) : (
        <p className="text-sm font-medium text-zinc-800 mt-0.5">{value}</p>
      )}
    </div>
  );
}

export default function ActiveProjectCard({ project }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
      <div className="flex flex-col sm:flex-row gap-5">
        <div className="w-full h-40 sm:w-36 sm:h-36 shrink-0 rounded-xl overflow-hidden bg-zinc-100">
          {project.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.imageUrl}
              alt={project.title}
              className="w-full h-full object-cover"
              style={{ objectPosition: project.objectPosition ?? "center" }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-300">
              <ImageOff size={28} strokeWidth={1.5} />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
            <div>
              <h3 className="text-lg font-bold text-zinc-900">{project.title}</h3>
              <p className="text-sm text-zinc-500 mt-0.5">
                {project.style} · {project.placement}
              </p>
            </div>
            <span className="text-[11px] font-medium text-violet-700 bg-violet-50 px-2.5 py-1 rounded-full whitespace-nowrap">
              {project.statusLabel}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3.5">
            <Field label="Current Stage" value={project.currentStageLabel} />
            <Field label="Next Step" value={project.nextStepLabel} />
            <Field label="Artist" value={project.artistName} pending={project.artistName === "Pending Assignment"} />
            <Field label="Estimated Price" value={project.priceLabel} />
            <Field label="Appointment" value={project.appointmentLabel ?? "Not scheduled"} />
            <Field label="Last Updated" value={project.lastUpdatedLabel} />
          </div>
        </div>

        <div className="flex sm:flex-col justify-end sm:justify-center shrink-0">
          <Link
            href={project.continueHref}
            className="whitespace-nowrap bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl px-5 py-3 transition-colors text-center"
          >
            View Project →
          </Link>
        </div>
      </div>
    </div>
  );
}
