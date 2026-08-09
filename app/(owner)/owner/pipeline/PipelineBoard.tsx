"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { isAllowedStatusTransition, type LeadStatus, type StageConfig } from "@/lib/pipeline";
import { updateConsultationStatus } from "@/app/book/[studio]/consult/actions";

export type CardData = {
  id: string;
  client_name: string;
  tattoo_description: string;
  placement: string;
  estimated_size: string;
  detected_style: string | null;
  budget_range: string;
  status: string;
  created_at: string;
  artist_id: string | null;
  artist_name: string | null;
  ai_recommended_price_min: number | null;
  ai_recommended_price_max: number | null;
  final_price: number | null;
  final_sessions: number | null;
  source: "consultation" | "custom_request";
};

// Light-theme counterpart to PIPELINE_STAGES' dark badge classes — same
// mapping already used by the Consultations list/detail pages.
const LIGHT_STAGE_BADGE: Record<LeadStatus, string> = {
  new:          "bg-blue-50 text-blue-700",
  reviewed:     "bg-yellow-50 text-yellow-700",
  quoted:       "bg-amber-50 text-amber-700",
  deposit_paid: "bg-violet-50 text-violet-700",
  booked:       "bg-emerald-50 text-emerald-700",
  completed:    "bg-green-50 text-green-700",
  lost:         "bg-zinc-100 text-zinc-500",
};

const NEEDS_ACTION: ReadonlySet<string> = new Set(["new", "reviewed"]);

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtPrice(lo: number | null, hi: number | null) {
  if (!lo && !hi) return null;
  if (lo && hi) return `$${lo.toLocaleString()} – $${hi.toLocaleString()}`;
  if (lo) return `From $${lo.toLocaleString()}`;
  return null;
}

// ── Card ─────────────────────────────────────────────────────────────────────

function PipelineCard({
  card,
  stages,
  onMove,
  moving,
}: {
  card: CardData;
  stages: StageConfig[];
  onMove: (id: string, status: string) => void;
  moving: boolean;
}) {
  const price = card.final_price
    ? `$${card.final_price.toLocaleString()}`
    : fmtPrice(card.ai_recommended_price_min, card.ai_recommended_price_max);
  const needsAction = NEEDS_ACTION.has(card.status);
  // Completed and Lost (the latter only ever seen in the archive section
  // below) are both terminal — static badge, no editable dropdown. "lost"
  // isn't itself one of the board's stage options, so without this check the
  // select would render with zero legal options for an archived card.
  const isTerminal = card.status === "completed" || card.status === "lost";

  // Options a manual change can legally land on from here, in canonical
  // order — mirrors the same isAllowedStatusTransition() guard
  // updateConsultationStatus() enforces server-side, so a selection can't
  // even attempt an illegal move (including "Booked", which is never
  // manually reachable — only Confirm Appointment can set it).
  const options = stages.filter((s) => s.value === card.status || isAllowedStatusTransition(card.status, s.value));

  return (
    <div
      className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-opacity ${
        moving ? "opacity-50" : ""
      } ${needsAction ? "border-amber-200" : "border-zinc-200"}`}
    >
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-1">
          <p className="text-xs font-semibold text-zinc-900 leading-tight truncate">{card.client_name}</p>
          <p className="text-[10px] text-zinc-400 shrink-0 ml-1">{fmtDate(card.created_at)}</p>
        </div>

        <div className="flex flex-wrap gap-1">
          <span
            className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
              card.source === "consultation" ? "bg-violet-50 text-violet-600" : "bg-sky-50 text-sky-600"
            }`}
          >
            {card.source === "consultation" ? "Consultation" : "Custom Request"}
          </span>
          {card.detected_style && (
            <span className="text-[9px] px-1.5 py-0.5 bg-zinc-100 text-zinc-600 rounded-full">
              {card.detected_style}
            </span>
          )}
          {needsAction && (
            <span className="text-[9px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded-full font-medium flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-amber-500" />
              Needs action
            </span>
          )}
        </div>

        <p className="text-[11px] text-zinc-500 leading-relaxed line-clamp-2">{card.tattoo_description}</p>

        <p className="text-[10px] text-zinc-400 truncate">
          {card.artist_name ?? "Unassigned"} · {card.estimated_size.split(" (")[0]}
        </p>

        {price && <p className="text-[11px] font-semibold text-violet-700">{price}</p>}
      </div>

      <div className="px-3 pb-3 flex items-center gap-1.5">
        {card.source === "consultation" ? (
          isTerminal ? (
            <span className={`flex-1 text-[9px] uppercase tracking-widest px-2 py-1.5 rounded-lg truncate text-center ${LIGHT_STAGE_BADGE[card.status as LeadStatus]}`}>
              {card.status === "lost" ? "Lost" : "Completed"}
            </span>
          ) : (
            <select
              value={card.status}
              disabled={moving}
              onChange={(e) => onMove(card.id, e.target.value)}
              className="flex-1 min-w-0 text-[9px] bg-zinc-50 border border-zinc-200 text-zinc-600 rounded-lg px-2 py-1.5 cursor-pointer focus:outline-none hover:border-violet-300 transition-colors truncate"
            >
              {options.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          )
        ) : (
          <span className={`flex-1 text-[9px] uppercase tracking-widest px-2 py-1.5 rounded-lg truncate text-center ${LIGHT_STAGE_BADGE[card.status as LeadStatus]}`}>
            {card.status === "lost" ? "Declined" : "Custom Request"}
          </span>
        )}
        <Link
          href={card.source === "consultation" ? `/owner/consultations/${card.id}` : `/owner/requests/${card.id}`}
          className="text-[9px] uppercase tracking-widest text-violet-600 hover:text-violet-700 transition-colors shrink-0 px-2 py-1.5 border border-violet-100 rounded-lg hover:border-violet-300"
        >
          Open
        </Link>
      </div>
    </div>
  );
}

// ── Main Board ───────────────────────────────────────────────────────────────

export default function PipelineBoard({
  boardStages,
  lostStage,
  boardCards,
  lostCards,
  stageCounts,
}: {
  boardStages: StageConfig[];
  lostStage: StageConfig;
  boardCards: CardData[];
  lostCards: CardData[];
  stageCounts: Record<string, number>;
}) {
  const [cards, setCards]         = useState(boardCards);
  const [archived, setArchived]   = useState(lostCards);
  const [movingId, setMovingId]   = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>(boardStages[0].value);
  const [showLost, setShowLost]   = useState(false);
  const [, startTrans]            = useTransition();

  // The dropdown needs "Lost" as a selectable exit even though it isn't a
  // board column — boardStages alone would make Lost unreachable from the UI.
  const dropdownStages = [...boardStages, lostStage];

  function handleMove(id: string, newStatus: string) {
    setMoveError(null);
    setMovingId(id);
    const prev = cards.find((c) => c.id === id)?.status ?? "new";
    // Optimistic — a card moving to "lost" disappears from the board into the
    // archive immediately; reverted below if the server rejects the move.
    if (newStatus === "lost") {
      const moved = cards.find((c) => c.id === id);
      setCards((cs) => cs.filter((c) => c.id !== id));
      if (moved) setArchived((as) => [{ ...moved, status: "lost" }, ...as]);
    } else {
      setCards((cs) => cs.map((c) => (c.id === id ? { ...c, status: newStatus } : c)));
    }
    startTrans(async () => {
      const result = await updateConsultationStatus(id, newStatus as never);
      setMovingId(null);
      if (result.error) {
        // Revert
        if (newStatus === "lost") {
          const moved = archived.find((c) => c.id === id) ?? cards.find((c) => c.id === id);
          setArchived((as) => as.filter((c) => c.id !== id));
          if (moved) setCards((cs) => [...cs, { ...moved, status: prev }]);
        } else {
          setCards((cs) => cs.map((c) => (c.id === id ? { ...c, status: prev } : c)));
        }
        setMoveError(result.error);
      }
    });
  }

  const byStage = (s: string) => cards.filter((c) => c.status === s);

  return (
    <div>
      {moveError && (
        <div className="mb-4 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {moveError}
        </div>
      )}

      {/* ── Desktop Kanban ──────────────────────────────────────────── */}
      <div className="hidden md:block overflow-x-auto pb-4">
        <div className="flex gap-3 min-w-max">
          {boardStages.map((stage) => {
            const stageCards = byStage(stage.value);
            return (
              <div key={stage.value} className="w-[230px] shrink-0 flex flex-col gap-2">
                <div className="flex items-center gap-2 px-1 py-1">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${stage.dot}`} />
                  <span className="text-[11px] font-semibold text-zinc-700 truncate">{stage.label}</span>
                  <span className="ml-auto text-[11px] text-zinc-400 font-mono tabular-nums shrink-0">
                    {stageCounts[stage.value] ?? stageCards.length}
                  </span>
                </div>
                {stageCards.length === 0 ? (
                  <div className="border border-dashed border-zinc-200 rounded-xl px-3 py-8 text-center">
                    <p className="text-[10px] text-zinc-300">—</p>
                  </div>
                ) : (
                  stageCards.map((card) => (
                    <PipelineCard
                      key={card.id}
                      card={card}
                      stages={dropdownStages}
                      onMove={handleMove}
                      moving={movingId === card.id}
                    />
                  ))
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Mobile Tabbed View ──────────────────────────────────────── */}
      <div className="md:hidden space-y-4">
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {boardStages.map((stage) => (
            <button
              key={stage.value}
              onClick={() => setActiveTab(stage.value)}
              className={`shrink-0 px-3 py-1.5 rounded-full border text-[10px] uppercase tracking-wider font-medium transition-all whitespace-nowrap ${
                activeTab === stage.value
                  ? "border-violet-200 bg-violet-50 text-violet-700"
                  : "border-zinc-200 text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {stage.short}
              {(stageCounts[stage.value] ?? 0) > 0 && (
                <span className="ml-1 opacity-70">{stageCounts[stage.value]}</span>
              )}
            </button>
          ))}
        </div>

        {byStage(activeTab).length === 0 ? (
          <div className="border border-dashed border-zinc-200 rounded-xl px-6 py-12 text-center">
            <p className="text-sm text-zinc-400">No leads in this stage</p>
          </div>
        ) : (
          <div className="space-y-3">
            {byStage(activeTab).map((card) => (
              <PipelineCard
                key={card.id}
                card={card}
                stages={dropdownStages}
                onMove={handleMove}
                moving={movingId === card.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Lost archive ────────────────────────────────────────────── */}
      {/* Lost is a same-tier exit, not a rung on the ladder — kept out of the
          main board and shown as a collapsed archive instead. */}
      {archived.length > 0 && (
        <div className="mt-6 bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowLost((v) => !v)}
            className="w-full px-5 py-3 flex items-center justify-between gap-3 text-left hover:bg-zinc-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full shrink-0 ${lostStage.dot}`} />
              <span className="text-[10px] uppercase tracking-widest text-zinc-400">Lost archive</span>
              <span className="text-[11px] text-zinc-400 font-mono tabular-nums">{archived.length}</span>
            </div>
            <span className="text-xs text-zinc-400">{showLost ? "Hide ↑" : "Show ↓"}</span>
          </button>
          {showLost && (
            <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {archived.map((card) => (
                <PipelineCard
                  key={card.id}
                  card={card}
                  stages={dropdownStages}
                  onMove={handleMove}
                  moving={movingId === card.id}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
