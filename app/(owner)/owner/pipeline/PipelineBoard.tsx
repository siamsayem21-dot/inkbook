"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { PIPELINE_STAGES, getStage } from "@/lib/pipeline";
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
  ai_recommended_price_min: number | null;
  ai_recommended_price_max: number | null;
  final_price: number | null;
  final_sessions: number | null;
  source: "consultation" | "custom_request";
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtPrice(lo: number | null, hi: number | null) {
  if (!lo && !hi) return null;
  if (lo && hi) return `$${lo.toLocaleString()} – $${hi.toLocaleString()}`;
  if (lo) return `From $${lo.toLocaleString()}`;
  return null;
}

// ── Desktop Kanban Card ─────────────────────────────────────────────────────

function PipelineCard({
  card,
  onMove,
  moving,
}: {
  card: CardData;
  onMove: (id: string, status: string) => void;
  moving: boolean;
}) {
  const stage  = getStage(card.status);
  const price  = card.final_price
    ? `$${card.final_price.toLocaleString()}`
    : fmtPrice(card.ai_recommended_price_min, card.ai_recommended_price_max);

  return (
    <div
      className={`bg-[#111] border border-[#1E1E1E] rounded-xl overflow-hidden transition-opacity ${
        moving ? "opacity-50" : ""
      }`}
    >
      <div className={`h-0.5 ${stage.dot}`} />
      <div className="p-3 space-y-2">
        {/* Name + date */}
        <div className="flex items-start justify-between gap-1">
          <p className="text-xs font-semibold text-[#E8E8E8] leading-tight truncate">
            {card.client_name}
          </p>
          <p className="text-[10px] text-zinc-700 shrink-0 ml-1">{fmtDate(card.created_at)}</p>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {card.detected_style && (
            <span className="text-[9px] px-1.5 py-0.5 bg-[#D4A853]/10 text-[#D4A853] border border-[#D4A853]/20 rounded-full">
              {card.detected_style}
            </span>
          )}
          <span className="text-[9px] px-1.5 py-0.5 bg-zinc-800 text-zinc-500 border border-zinc-700/50 rounded-full">
            {card.estimated_size.split(" (")[0]}
          </span>
        </div>

        {/* Description */}
        <p className="text-[11px] text-zinc-500 leading-relaxed line-clamp-2">
          {card.tattoo_description}
        </p>

        {/* Price if quoted */}
        {price && (
          <p className="text-[11px] font-semibold text-[#D4A853]">{price}</p>
        )}
      </div>

      {/* Actions */}
      <div className="px-3 pb-3 flex items-center gap-1.5">
        {card.source === "consultation" ? (
          <select
            value={card.status}
            disabled={moving}
            onChange={(e) => onMove(card.id, e.target.value)}
            className="flex-1 min-w-0 text-[9px] bg-[#0d0d0d] border border-[#252525] text-zinc-500 rounded-lg px-2 py-1.5 cursor-pointer focus:outline-none hover:border-zinc-600 transition-colors appearance-none truncate"
          >
            {PIPELINE_STAGES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        ) : (
          <span className="flex-1 text-[9px] uppercase tracking-widest text-zinc-600 px-2 py-1.5 border border-[#1E1E1E] rounded-lg truncate">
            Custom Request
          </span>
        )}
        <Link
          href={card.source === "consultation" ? `/owner/consultations/${card.id}` : `/owner/requests/${card.id}`}
          className="text-[9px] uppercase tracking-widest text-[#D4A853] hover:text-[#C49A3C] transition-colors shrink-0 px-2 py-1.5 border border-[#D4A853]/20 rounded-lg hover:border-[#D4A853]/40"
        >
          Open
        </Link>
      </div>
    </div>
  );
}

// ── Mobile List Card ─────────────────────────────────────────────────────────

function MobileCard({
  card,
  onMove,
  moving,
}: {
  card: CardData;
  onMove: (id: string, status: string) => void;
  moving: boolean;
}) {
  const stage  = getStage(card.status);
  const price  = card.final_price
    ? `$${card.final_price.toLocaleString()}`
    : fmtPrice(card.ai_recommended_price_min, card.ai_recommended_price_max);

  return (
    <div
      className={`bg-[#111] border border-[#1E1E1E] rounded-xl overflow-hidden transition-opacity ${
        moving ? "opacity-50" : ""
      }`}
    >
      <div className={`h-0.5 ${stage.dot}`} />
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <p className="font-semibold text-[#E8E8E8] text-sm">{card.client_name}</p>
              {card.detected_style && (
                <span className="text-[9px] px-2 py-0.5 bg-[#D4A853]/10 text-[#D4A853] border border-[#D4A853]/20 rounded-full">
                  {card.detected_style}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500">{card.placement} · {card.estimated_size.split(" (")[0]}</p>
            <p className="text-xs text-zinc-400 mt-1.5 line-clamp-2 leading-relaxed">
              {card.tattoo_description}
            </p>
            {price && (
              <p className="text-xs font-semibold text-[#D4A853] mt-1.5">{price}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-zinc-700">{fmtDate(card.created_at)}</p>
          </div>
        </div>
      </div>
      <div className="px-4 pb-3 flex items-center gap-2">
        {card.source === "consultation" ? (
          <select
            value={card.status}
            disabled={moving}
            onChange={(e) => onMove(card.id, e.target.value)}
            className="flex-1 text-[10px] bg-[#0d0d0d] border border-[#252525] text-zinc-500 rounded-lg px-3 py-2 cursor-pointer focus:outline-none hover:border-zinc-600 transition-colors"
          >
            {PIPELINE_STAGES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        ) : (
          <span className="flex-1 text-[10px] uppercase tracking-widest text-zinc-600 px-3 py-2 border border-[#1E1E1E] rounded-lg truncate">
            Custom Request
          </span>
        )}
        <Link
          href={card.source === "consultation" ? `/owner/consultations/${card.id}` : `/owner/requests/${card.id}`}
          className="text-[10px] text-[#D4A853] hover:text-[#C49A3C] transition-colors px-3 py-2 border border-[#D4A853]/20 rounded-lg hover:border-[#D4A853]/40 shrink-0"
        >
          Open →
        </Link>
      </div>
    </div>
  );
}

// ── Main Board ───────────────────────────────────────────────────────────────

export default function PipelineBoard({ initialConsults }: { initialConsults: CardData[] }) {
  const [consults, setConsults]   = useState(initialConsults);
  const [movingId, setMovingId]   = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>(PIPELINE_STAGES[0].value);
  const [, startTrans]            = useTransition();

  function handleMove(id: string, newStatus: string) {
    setMoveError(null);
    setMovingId(id);
    const prev = consults.find((c) => c.id === id)?.status ?? "new";
    // Optimistic
    setConsults((cs) => cs.map((c) => c.id === id ? { ...c, status: newStatus } : c));
    startTrans(async () => {
      const result = await updateConsultationStatus(id, newStatus as never);
      setMovingId(null);
      if (result.error) {
        // Revert
        setConsults((cs) => cs.map((c) => c.id === id ? { ...c, status: prev } : c));
        setMoveError(result.error);
      }
    });
  }

  const byStage = (s: string) => consults.filter((c) => c.status === s);

  // Totals for each stage
  const stageCounts = PIPELINE_STAGES.map((s) => ({
    ...s,
    count: byStage(s.value).length,
  }));

  return (
    <div>
      {moveError && (
        <div className="mb-4 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
          {moveError}
        </div>
      )}

      {/* ── Desktop Kanban ──────────────────────────────────────────── */}
      <div className="hidden md:block overflow-x-auto pb-4">
        <div className="flex gap-3 min-w-max">
          {stageCounts.map((stage) => {
            const cards = byStage(stage.value);
            return (
              <div key={stage.value} className="w-[210px] shrink-0 flex flex-col gap-2">
                {/* Column header */}
                <div className="flex items-center gap-2 px-1 py-1">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${stage.dot}`} />
                  <span className="text-[11px] font-medium text-zinc-400 truncate">{stage.label}</span>
                  <span className="ml-auto text-[11px] text-zinc-700 font-mono tabular-nums shrink-0">
                    {stage.count}
                  </span>
                </div>
                {/* Empty column */}
                {cards.length === 0 ? (
                  <div className="border border-dashed border-[#1C1C1C] rounded-xl px-3 py-8 text-center">
                    <p className="text-[10px] text-zinc-800">—</p>
                  </div>
                ) : (
                  cards.map((card) => (
                    <PipelineCard
                      key={card.id}
                      card={card}
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
        {/* Tab bar */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {stageCounts.map((stage) => (
            <button
              key={stage.value}
              onClick={() => setActiveTab(stage.value)}
              className={`shrink-0 px-3 py-1.5 rounded-full border text-[10px] uppercase tracking-wider font-medium transition-all whitespace-nowrap ${
                activeTab === stage.value
                  ? stage.color
                  : "border-[#252525] text-zinc-600 hover:text-zinc-400"
              }`}
            >
              {stage.short}
              {stage.count > 0 && (
                <span className="ml-1 opacity-70">{stage.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Cards */}
        {byStage(activeTab).length === 0 ? (
          <div className="border border-dashed border-[#1C1C1C] rounded-xl px-6 py-12 text-center">
            <p className="text-sm text-zinc-700">No leads in this stage</p>
          </div>
        ) : (
          <div className="space-y-3">
            {byStage(activeTab).map((card) => (
              <MobileCard
                key={card.id}
                card={card}
                onMove={handleMove}
                moving={movingId === card.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
