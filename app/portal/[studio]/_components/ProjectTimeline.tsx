import { deriveProjectStage, PROJECT_STAGES, type ProjectStageInput } from "@/lib/client-portal/project-stage";

interface Props extends ProjectStageInput {
  brandColor: string;
}

export default function ProjectTimeline({ status, quoteAcceptedAt, depositPaidAt, bookingStatus, brandColor }: Props) {
  const currentIndex = deriveProjectStage({ status, quoteAcceptedAt, depositPaidAt, bookingStatus });

  return (
    <div className="space-y-2.5">
      {PROJECT_STAGES.map((label, i) => {
        const done = i <= currentIndex;
        return (
          <div key={label} className="flex items-center gap-3">
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
              style={
                done
                  ? { backgroundColor: brandColor, color: "#000" }
                  : { border: "1px solid #e4e4e7" }
              }
            >
              {done ? "✓" : ""}
            </span>
            <span className={`text-sm ${done ? "text-zinc-900 font-medium" : "text-zinc-400"}`}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}
