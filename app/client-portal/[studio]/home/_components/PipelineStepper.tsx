import { Check } from "lucide-react";

// Client-facing 10-step visual pipeline for the Home page header banner and
// the Project Detail page — shared so both stay in the same order. This is a
// coarser, display-only view, deliberately separate from lib/pipeline.ts
// (owner's internal lead pipeline) and lib/client-portal/project-stage.ts
// (the 7-stage Project Detail timeline).
export const HOME_PIPELINE_STAGES = [
  "Consultation",
  "Design & Size",
  "Artist",
  "Quote",
  "Deposit",
  "Booking",
  "Consent",
  "Appointment",
  "Aftercare",
  "Review & Rating",
] as const;

interface Props {
  currentIndex: number;
  // Explicit list of which stages are actually done. Omit only for simple
  // callers happy with the old "everything before currentIndex is done"
  // shorthand (that's still correct as long as currentIndex genuinely
  // reflects the furthest-reached stage and nothing was skipped) — anywhere
  // a stage's completion depends on real, independent project state (quote
  // accepted, deposit paid, consent signed, booking confirmed, etc.) that
  // doesn't move in lockstep with currentIndex, pass this explicitly so a
  // later stage's index never implies an earlier one finished when it
  // didn't.
  completedIndices?: number[];
}

export default function PipelineStepper({ currentIndex, completedIndices }: Props) {
  const doneSet = new Set(completedIndices ?? Array.from({ length: currentIndex }, (_, i) => i));

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm px-6 sm:px-8 py-7 overflow-x-auto">
      <div className="flex items-start min-w-[960px]">
        {HOME_PIPELINE_STAGES.map((label, i) => {
          const done = doneSet.has(i);
          const current = i === currentIndex;
          const isLast = i === HOME_PIPELINE_STAGES.length - 1;

          return (
            <div key={label} className={`flex items-center ${isLast ? "" : "flex-1"}`}>
              <div className="flex flex-col items-center w-[92px] shrink-0 text-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    done
                      ? "bg-emerald-500 text-white"
                      : current
                        ? "bg-violet-600 text-white ring-4 ring-violet-100"
                        : "bg-white border-2 border-zinc-200"
                  }`}
                >
                  {done ? <Check size={14} strokeWidth={3} /> : current ? <span className="w-2 h-2 rounded-full bg-white" /> : null}
                </div>
                <span className={`mt-2.5 text-xs leading-tight font-medium ${current && !done ? "text-violet-700" : done ? "text-zinc-700" : "text-zinc-400"}`}>
                  {label}
                </span>
              </div>
              {!isLast && <div className={`flex-1 h-[2px] mx-1.5 rounded-full ${done ? "bg-emerald-400" : "bg-zinc-200"}`} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
