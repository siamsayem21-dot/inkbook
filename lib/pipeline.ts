// Shared pipeline stage config — single source of truth for labels, colors, order.

export type LeadStatus =
  | "new"
  | "reviewed"
  | "quoted"
  | "deposit_paid"
  | "booked"
  | "completed"
  | "lost";

export const PIPELINE_STAGES = [
  {
    value:  "new"          as LeadStatus,
    label:  "New",
    short:  "New",
    color:  "bg-blue-500/10 text-blue-400 border-blue-500/20",
    dot:    "bg-blue-500",
    text:   "text-blue-400",
    next:   "reviewed"    as LeadStatus,
  },
  {
    value:  "reviewed"     as LeadStatus,
    label:  "Reviewed",
    short:  "Reviewed",
    color:  "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    dot:    "bg-yellow-500",
    text:   "text-yellow-400",
    next:   "quoted"      as LeadStatus,
  },
  {
    value:  "quoted"       as LeadStatus,
    label:  "Quoted",
    short:  "Quoted",
    color:  "bg-amber-500/10 text-amber-400 border-amber-500/20",
    dot:    "bg-amber-500",
    text:   "text-amber-400",
    next:   "booked"      as LeadStatus,
  },
  {
    value:  "booked"       as LeadStatus,
    label:  "Booked",
    short:  "Booked",
    color:  "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    dot:    "bg-emerald-500",
    text:   "text-emerald-400",
    next:   "deposit_paid" as LeadStatus,
  },
  {
    value:  "deposit_paid" as LeadStatus,
    label:  "Deposit Paid",
    short:  "Deposit",
    color:  "bg-violet-500/10 text-violet-400 border-violet-500/20",
    dot:    "bg-violet-500",
    text:   "text-violet-400",
    next:   "completed"   as LeadStatus,
  },
  {
    value:  "completed"    as LeadStatus,
    label:  "Completed",
    short:  "Done",
    color:  "bg-green-500/10 text-green-400 border-green-500/20",
    dot:    "bg-green-500",
    text:   "text-green-400",
    next:   null,
  },
  {
    value:  "lost"         as LeadStatus,
    label:  "Lost",
    short:  "Lost",
    color:  "bg-zinc-500/10 text-zinc-500 border-zinc-700",
    dot:    "bg-zinc-600",
    text:   "text-zinc-500",
    next:   null,
  },
] as const;

export type StageConfig = typeof PIPELINE_STAGES[number];

export const STAGE_MAP: Record<string, StageConfig> = Object.fromEntries(
  PIPELINE_STAGES.map((s) => [s.value, s])
) as Record<string, StageConfig>;

export function getStage(status: string): StageConfig {
  // "converted" is a legacy terminal state semantically equivalent to "completed"
  if (status === "converted") return STAGE_MAP["completed"] as StageConfig;
  return (STAGE_MAP[status] ?? STAGE_MAP["new"]) as StageConfig;
}
