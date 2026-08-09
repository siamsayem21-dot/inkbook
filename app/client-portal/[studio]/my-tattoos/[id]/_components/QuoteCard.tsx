import { Sparkles, Receipt } from "lucide-react";
import SectionCard from "./SectionCard";
import type { ProjectDetailData } from "../types";

interface Props {
  quote: ProjectDetailData["quote"];
  onAcceptQuote: () => void;
  accepting: boolean;
  acceptError: string | null;
}

const STATUS_META: Record<NonNullable<ProjectDetailData["quote"]>["status"], { label: string; className: string }> = {
  not_ready: { label: "Not Ready", className: "text-zinc-500 bg-zinc-100" },
  awaiting_review: { label: "Awaiting Review", className: "text-amber-700 bg-amber-50" },
  accepted: { label: "Accepted", className: "text-emerald-700 bg-emerald-50" },
};

export default function QuoteCard({ quote, onAcceptQuote, accepting, acceptError }: Props) {
  if (!quote) {
    return (
      <SectionCard id="quote" icon={Receipt} title="Quote" muted>
        <p className="text-sm text-zinc-500">No quote yet — this shows up once the studio reviews your consultation.</p>
      </SectionCard>
    );
  }

  const meta = STATUS_META[quote.status];

  return (
    <SectionCard
      id="quote"
      icon={Receipt}
      title="Quote"
      badge={<span className={`text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${meta.className}`}>{meta.label}</span>}
    >
      {/* Final Quote is the number the client acts on — kept visually primary
          and clearly attributed to the artist/studio. The AI estimate (when
          one exists) is shown alongside as reference-only, never presented
          as the price the client is accepting. */}
      <div className="flex flex-col sm:flex-row gap-5 mb-1">
        <div>
          <p className="text-xs text-zinc-400">Final Quote <span className="text-zinc-300 font-normal">(Artist Approved)</span></p>
          <p className="text-xl font-bold text-zinc-900 mt-0.5">{quote.finalPriceLabel ?? "Not yet finalized"}</p>
        </div>
        {quote.estimatedPriceLabel && (
          <div>
            <p className="text-xs text-zinc-400">AI Estimate <span className="text-zinc-300 font-normal">(Reference Only)</span></p>
            <p className="text-sm font-medium text-zinc-500 mt-0.5">{quote.estimatedPriceLabel}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3.5 mt-4 pt-4 border-t border-zinc-100">
        <div>
          <p className="text-xs text-zinc-400">Sessions</p>
          <p className="text-sm font-medium text-zinc-800 mt-0.5">{quote.estimatedSessions ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-400">Duration</p>
          <p className="text-sm font-medium text-zinc-800 mt-0.5">{quote.estimatedDuration ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-400">Quote Date</p>
          <p className="text-sm font-medium text-zinc-800 mt-0.5">{quote.quoteDateLabel ?? "—"}</p>
        </div>
      </div>

      {quote.artistNotes && (
        <div className="mt-4 pt-4 border-t border-zinc-100">
          <p className="text-xs text-zinc-400 mb-1">Artist Notes</p>
          <p className="text-sm text-zinc-600 leading-relaxed">{quote.artistNotes}</p>
        </div>
      )}

      <p className="text-[11px] text-zinc-300 mt-4">
        AI estimates are for reference only. Your final price is always set and approved by the artist or studio.
      </p>

      {quote.status === "accepted" && quote.acceptedDateLabel && (
        <p className="text-xs font-medium text-emerald-700 mt-4">✓ Accepted on {quote.acceptedDateLabel}</p>
      )}

      {quote.status === "awaiting_review" && quote.finalPriceLabel && (
        <div className="mt-4 pt-4 border-t border-zinc-100">
          <button
            type="button"
            disabled={accepting}
            onClick={onAcceptQuote}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-sm py-3 px-5 bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50 transition-colors"
          >
            {accepting ? "Working…" : "Accept Quote"}
            <Sparkles size={15} />
          </button>
          {acceptError && <p className="text-xs text-red-600 mt-2">{acceptError}</p>}
        </div>
      )}
    </SectionCard>
  );
}
