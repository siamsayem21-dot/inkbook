import Link from "next/link";
import type { ProjectDetailData } from "../types";

interface Props {
  action: ProjectDetailData["primaryAction"];
  compact?: boolean;
}

// The one prominent, state-driven CTA — rendered identically in the project
// header and at the bottom of the sticky summary sidebar (same `action` data,
// same component) so the two never drift out of sync. Purely navigational —
// the one truly interactive step (Accept Quote) lives in QuoteCard via
// ProjectDetailView instead, since accepting a quote has to update this
// whole page's state together, not just one button's own local state.
export default function PrimaryActionButton({ action, compact }: Props) {
  const base = `inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors ${
    compact ? "w-full text-sm py-3" : "text-[15px] px-6 py-3.5"
  }`;

  if (action.kind === "none") return null;

  if (action.kind === "disabled") {
    return (
      <span title="Demo data — not connected" className={`${base} bg-zinc-100 text-zinc-400 cursor-not-allowed`}>
        {action.label}
      </span>
    );
  }

  return (
    <Link href={action.href ?? "#"} className={`${base} bg-violet-600 hover:bg-violet-700 text-white`}>
      {action.label}
    </Link>
  );
}
