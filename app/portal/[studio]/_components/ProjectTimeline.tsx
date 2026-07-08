const STAGES = [
  "Consultation Submitted",
  "Under Review",
  "Quote Ready",
  "Deposit Pending",
  "Booking Confirmed",
] as const;

const STATUS_TO_STAGE_INDEX: Record<string, number> = {
  new: 0,
  reviewed: 1,
  quoted: 2,
  deposit_paid: 3,
  booked: 4,
  completed: 4,
  converted: 4,
  lost: 0,
};

interface Props {
  status: string;
  brandColor: string;
}

export default function ProjectTimeline({ status, brandColor }: Props) {
  const currentIndex = STATUS_TO_STAGE_INDEX[status] ?? 0;

  return (
    <div className="space-y-2.5">
      {STAGES.map((label, i) => {
        const done = i <= currentIndex;
        return (
          <div key={label} className="flex items-center gap-3">
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
              style={
                done
                  ? { backgroundColor: brandColor, color: "#000" }
                  : { border: "1px solid rgba(255,255,255,0.15)" }
              }
            >
              {done ? "✓" : ""}
            </span>
            <span className={`text-sm ${done ? "text-zinc-200" : "text-zinc-600"}`}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}
