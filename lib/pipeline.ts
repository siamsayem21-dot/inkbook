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

// custom_requests uses its own status vocabulary (pending/quoted/accepted/declined/completed) —
// this maps it onto the shared LeadStatus funnel so consultations + custom_requests can be
// merged into one pipeline view. Mirrors the mapping in app/(owner)/owner/pipeline/page.tsx —
// kept here too so new call sites (e.g. the owner dashboard) don't redefine it separately.
export const CUSTOM_REQUEST_STATUS_MAP: Record<string, LeadStatus> = {
  pending:   "new",
  quoted:    "quoted",
  accepted:  "deposit_paid",
  declined:  "lost",
  completed: "completed",
};

// Stages that represent "this lead became a real booking" — used for booking-rate math.
export const BOOKED_OR_LATER: ReadonlySet<LeadStatus> = new Set<LeadStatus>(["booked", "deposit_paid", "completed"]);

// "Qualified Leads" per the owner dashboard's business definition: reviewed, quoted,
// deposit_paid, booked, or completed (i.e. everything except brand-new intake and lost).
// "converted" isn't listed separately — getStage()/status normalization already folds it
// into "completed" before this set is ever checked.
export const QUALIFIED_STAGES: ReadonlySet<LeadStatus> = new Set<LeadStatus>(["reviewed", "quoted", "booked", "deposit_paid", "completed"]);

// "a quote has been sent" — Deposit Rate's denominator ("deposits paid / quotes sent").
export const QUOTED_OR_LATER: ReadonlySet<LeadStatus> = new Set<LeadStatus>(["quoted", "booked", "deposit_paid", "completed"]);

// "the deposit has actually been paid" — Deposit Rate's numerator.
export const DEPOSIT_PAID_OR_LATER: ReadonlySet<LeadStatus> = new Set<LeadStatus>(["deposit_paid", "completed"]);

// Canonical lifecycle order for validating status transitions (owner consultation
// detail page + its server actions) — deliberately independent of PIPELINE_STAGES'
// own array order above (which drives Pipeline board / dashboard display and is
// left untouched so those pages don't change). This order is the actual intended
// review lifecycle: New → Reviewed → Quoted → Deposit Paid → Booked → Completed,
// with "lost" as a same-tier exit reachable from any non-terminal stage. The
// booking/deposit backend (bookConsultation(), the Stripe webhook) has been
// brought in line with this order too — see actions.ts and the webhook route.
export const LIFECYCLE_ORDER: LeadStatus[] = [
  "new", "reviewed", "quoted", "deposit_paid", "booked", "completed",
];

// "completed" and "lost" are both terminal — no further status/quote/booking
// changes once a consultation reaches either one.
export const TERMINAL_STATUSES: ReadonlySet<LeadStatus> = new Set<LeadStatus>(["completed", "lost"]);

// Strict rule for MANUAL, human-initiated status changes — the consultation
// detail page's "Update Status" pills and the Pipeline board's per-card status
// dropdown both call updateConsultationStatus(), which is the sole caller of
// this function. Only the immediate next lifecycle stage is allowed, plus
// "lost" as an exit from any non-terminal stage — arbitrary forward-skipping
// (e.g. clicking "Booked" while still "Quoted") is rejected, same as any
// backward move or a change attempted from a terminal state.
//
// "Booked" specifically can NEVER be reached this way, from any stage — it's
// the one status this function refuses as a `to` value outright. Booked means
// "a real appointment was confirmed with a valid artist/date/time," which
// only bookConsultation() (Book/Schedule Appointment on the detail page) can
// establish; that function writes status directly and never calls through
// here, so this only blocks the manual pill/dropdown from faking it. Deposit
// Paid is the only stage adjacent to Booked, so in practice this is exactly
// "no manually clicking Deposit Paid -> Booked" — but phrased as an absolute
// rule so it can't be bypassed via any other adjacency either.
export function isAllowedStatusTransition(from: string, to: string): boolean {
  const fromStage = getStage(from).value;
  const toStage   = getStage(to).value;

  if (TERMINAL_STATUSES.has(fromStage)) return false; // terminal states are read-only
  if (toStage === "lost") return true;                // lost is reachable from any non-terminal stage
  if (toStage === "booked") return false;              // only bookConsultation() may set this

  const fromIdx = LIFECYCLE_ORDER.indexOf(fromStage);
  const toIdx   = LIFECYCLE_ORDER.indexOf(toStage);
  if (fromIdx === -1 || toIdx === -1) return false;
  return toIdx === fromIdx + 1;
}

// Looser rule for legitimate AUTOMATIC/system-driven transitions, which may
// legitimately advance more than one stage in a single step (e.g. saving a
// quote on a brand-new consultation jumps New straight to Quoted, skipping the
// manual "Reviewed" checkpoint) — but, like the strict rule above, must never
// move backward or out of a terminal state. Used by:
//   - saveConsultationQuote() advancing New/Reviewed -> Quoted
//   - bookConsultation() capping status at Quoted while a deposit is pending
//     (never "Booked" — that would let a not-yet-paid consultation look booked)
//   - the Stripe webhook (handleDepositPayment) advancing to Deposit Paid once
//     payment clears, guarding against ever regressing an already-"Booked"
//     consultation back to Deposit Paid
export function isForwardSystemTransition(from: string, to: string): boolean {
  const fromStage = getStage(from).value;
  const toStage   = getStage(to).value;

  if (TERMINAL_STATUSES.has(fromStage)) return false; // terminal states are read-only
  if (toStage === "lost") return true;                // lost is reachable from any non-terminal stage

  const fromIdx = LIFECYCLE_ORDER.indexOf(fromStage);
  const toIdx   = LIFECYCLE_ORDER.indexOf(toStage);
  if (fromIdx === -1 || toIdx === -1) return false;
  return toIdx >= fromIdx;
}
