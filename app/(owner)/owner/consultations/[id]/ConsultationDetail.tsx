"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateConsultationStatus,
  saveConsultationQuote,
} from "@/app/book/[studio]/consult/actions";
import { PIPELINE_STAGES, getStage } from "@/lib/pipeline";

// ── Types ─────────────────────────────────────────────────────────────────────

type ConsultRow = {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  tattoo_description: string;
  placement: string;
  estimated_size: string;
  color_preference: string;
  budget_range: string;
  reference_photos: string[];
  followup_questions: string[];
  followup_answers: Record<number, string>;
  detected_style: string | null;
  style_confidence: number | null;
  style_reasoning: string | null;
  ai_notes: string | null;
  status: string;
  ai_recommended_price_min: number | null;
  ai_recommended_price_max: number | null;
  ai_estimated_sessions: number | null;
  ai_estimated_hours: string | null;
  ai_difficulty: string | null;
  ai_quote_reasoning: string | null;
  final_price: number | null;
  final_sessions: number | null;
  quote_notes: string | null;
  quote_status: string;
  created_at: string;
};

type QuoteDraft = {
  priceLow:   number;
  priceHigh:  number;
  sessions:   number;
  hoursRange: string;
  difficulty: "Easy" | "Medium" | "Hard";
  reasoning:  string;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = PIPELINE_STAGES;

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy:   "bg-green-500/10 text-green-400 border-green-500/20",
  Medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  Hard:   "bg-red-500/10 text-red-400 border-red-500/20",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

function fmtMoney(n: number) {
  return `$${n.toLocaleString("en-US")}`;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-0.5">{label}</p>
      <p className="text-sm text-zinc-300">{value}</p>
    </div>
  );
}

const inputCls =
  "w-full bg-[#0a0a0a] border border-[#252525] text-white text-sm rounded-xl px-4 py-3 " +
  "placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors";

const labelCls = "block text-[10px] uppercase tracking-[0.13em] text-zinc-500 mb-1.5";

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ConsultationDetail({ consult }: { consult: ConsultRow }) {
  const router = useRouter();

  // ── Status state ──────────────────────────────────────────────────────────
  const [status, setStatus]     = useState(consult.status);
  const [isPending, startTrans] = useTransition();
  const [statusError, setErr]   = useState<string | null>(null);

  // ── Quote state ───────────────────────────────────────────────────────────
  const [quoteDraft, setQuoteDraft]     = useState<QuoteDraft | null>(null);
  const [generating, setGenerating]     = useState(false);
  const [genError, setGenError]         = useState<string | null>(null);
  const [finalPrice, setFinalPrice]     = useState(
    consult.final_price ? String(consult.final_price) : ""
  );
  const [finalSessions, setFinalSessions] = useState(
    consult.final_sessions ? String(consult.final_sessions) : ""
  );
  const [quoteNotes, setQuoteNotes]     = useState(consult.quote_notes ?? "");
  const [saving, setSaving]             = useState(false);
  const [saveError, setSaveError]       = useState<string | null>(null);
  const [quoteSaved, setQuoteSaved]     = useState(consult.quote_status === "saved");

  // What to display: live draft takes priority, then persisted data
  const displayDraft: QuoteDraft | null = quoteDraft ?? (
    consult.quote_status === "saved" ? {
      priceLow:   consult.ai_recommended_price_min ?? 0,
      priceHigh:  consult.ai_recommended_price_max ?? 0,
      sessions:   consult.ai_estimated_sessions    ?? 1,
      hoursRange: consult.ai_estimated_hours       ?? "–",
      difficulty: (consult.ai_difficulty ?? "Medium") as "Easy" | "Medium" | "Hard",
      reasoning:  consult.ai_quote_reasoning       ?? "",
    } : null
  );

  const currentStatusMeta = getStage(status);
  const confidence = Math.max(0, Math.min(100, Math.round(consult.style_confidence ?? 0)));

  const colorLabel =
    consult.color_preference === "color"      ? "Color"
    : consult.color_preference === "black_grey" ? "Black & Grey"
    : "Open to Both";

  const answeredQs = (consult.followup_questions ?? []).filter(
    (_, i) => (consult.followup_answers as Record<string, string>)[i]
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleStatusChange(newStatus: string) {
    setErr(null);
    startTrans(async () => {
      const result = await updateConsultationStatus(
        consult.id,
        newStatus as never
      );
      if (result.error) { setErr(result.error); return; }
      setStatus(newStatus);
      router.refresh();
    });
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/quote/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          size:            consult.estimated_size,
          colorPreference: consult.color_preference,
          style:           consult.detected_style,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: QuoteDraft = await res.json();
      setQuoteDraft(data);
      if (!finalPrice)    setFinalPrice(String(data.priceLow));
      if (!finalSessions) setFinalSessions(String(data.sessions));
      setQuoteSaved(false);
    } catch {
      setGenError("Could not calculate quote. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveQuote() {
    if (!displayDraft) return;
    setSaving(true);
    setSaveError(null);
    const result = await saveConsultationQuote(consult.id, {
      priceLow:      displayDraft.priceLow,
      priceHigh:     displayDraft.priceHigh,
      sessions:      displayDraft.sessions,
      hoursRange:    displayDraft.hoursRange,
      difficulty:    displayDraft.difficulty,
      reasoning:     displayDraft.reasoning,
      finalPrice:    parseInt(finalPrice)    || 0,
      finalSessions: parseInt(finalSessions) || 0,
      notes:         quoteNotes,
    });
    setSaving(false);
    if (result.error) { setSaveError(result.error); return; }
    setQuoteSaved(true);
    setStatus("quoted");
    router.refresh();
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Title + status badge */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-cinzel text-2xl font-bold tracking-wide">{consult.client_name}</h1>
          <p className="text-zinc-500 text-sm mt-0.5">{fmtDate(consult.created_at)}</p>
        </div>
        <span className={`text-xs px-3 py-1.5 rounded-full border shrink-0 ${currentStatusMeta.color}`}>
          {currentStatusMeta.label}
        </span>
      </div>

      {/* AI style detection */}
      {consult.detected_style && (
        <div className="bg-[#D4A853]/05 border border-[#D4A853]/20 rounded-xl p-4">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#D4A853]/60 mb-1">AI Detected Style</p>
              <p className="font-cinzel text-xl font-bold text-[#D4A853]">{consult.detected_style}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Confidence</p>
              <p className="text-xl font-bold text-[#D4A853]">{confidence}%</p>
            </div>
          </div>
          {confidence > 0 && (
            <div className="h-1 bg-[#252525] rounded-full overflow-hidden mb-3">
              <div className="h-full rounded-full bg-[#D4A853]" style={{ width: `${confidence}%` }} />
            </div>
          )}
          {consult.style_reasoning && (
            <p className="text-sm text-zinc-400 italic">&ldquo;{consult.style_reasoning}&rdquo;</p>
          )}
        </div>
      )}

      {/* AI notes */}
      {consult.ai_notes && (
        <div className="bg-[#0d0d0d] border border-[#1E1E1E] rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2">AI Notes for Artist</p>
          <p className="text-sm text-zinc-300 leading-relaxed">{consult.ai_notes}</p>
        </div>
      )}

      {/* Client info */}
      <div className="bg-[#111] border border-[#1E1E1E] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1A1A1A]">
          <p className="text-[10px] uppercase tracking-widest text-zinc-600">Client Information</p>
        </div>
        <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Detail label="Name"  value={consult.client_name} />
          <Detail label="Email" value={consult.client_email} />
          <Detail label="Phone" value={consult.client_phone} />
        </div>
        <div className="px-5 py-2.5 border-t border-[#1A1A1A] flex gap-3">
          <a href={`mailto:${consult.client_email}`} className="text-xs text-[#D4A853] hover:text-[#C49A3C] transition-colors">
            Email Client →
          </a>
          <a href={`tel:${consult.client_phone}`} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            Call →
          </a>
        </div>
      </div>

      {/* Project details */}
      <div className="bg-[#111] border border-[#1E1E1E] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1A1A1A]">
          <p className="text-[10px] uppercase tracking-widest text-zinc-600">Tattoo Project</p>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Detail label="Placement" value={consult.placement} />
            <Detail label="Size"      value={consult.estimated_size} />
            <Detail label="Color"     value={colorLabel} />
            <Detail label="Budget"    value={consult.budget_range} />
            {consult.detected_style && <Detail label="Style" value={consult.detected_style} />}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1.5">Description</p>
            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {consult.tattoo_description}
            </p>
          </div>
        </div>
      </div>

      {/* Reference photos */}
      {consult.reference_photos?.length > 0 && (
        <div className="bg-[#111] border border-[#1E1E1E] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#1A1A1A]">
            <p className="text-[10px] uppercase tracking-widest text-zinc-600">
              Reference Photos ({consult.reference_photos.length})
            </p>
          </div>
          <div className="px-5 py-4 flex flex-wrap gap-3">
            {consult.reference_photos.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Reference ${i + 1}`}
                  className="w-20 h-20 object-cover rounded-lg border border-[#252525] hover:border-zinc-500 transition-colors"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Follow-up Q&A */}
      {answeredQs.length > 0 && (
        <div className="bg-[#111] border border-[#1E1E1E] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#1A1A1A]">
            <p className="text-[10px] uppercase tracking-widests text-zinc-600">
              AI Follow-Up Answers ({answeredQs.length})
            </p>
          </div>
          <div className="px-5 py-4 space-y-4">
            {(consult.followup_questions ?? []).map((q, i) => {
              const answer = (consult.followup_answers as Record<string, string>)[i];
              if (!answer?.trim()) return null;
              return (
                <div key={i}>
                  <p className="text-[10px] text-zinc-600 mb-1 leading-relaxed">{q}</p>
                  <p className="text-sm text-zinc-300">{answer}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── AI Quote Section ──────────────────────────────────────────────────── */}
      <div className="bg-[#111] border border-[#1E1E1E] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1A1A1A] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <p className="text-[10px] uppercase tracking-widest text-zinc-600">AI Quote</p>
            {quoteSaved && (
              <span className="text-[10px] px-2 py-0.5 rounded-full border bg-green-500/10 text-green-400 border-green-500/20">
                Saved
              </span>
            )}
          </div>
          {displayDraft && !generating && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="text-[10px] uppercase tracking-widest text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Regenerate
            </button>
          )}
        </div>

        {/* No quote yet */}
        {!displayDraft && !generating && (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-zinc-500 mb-1 leading-relaxed">
              Generate a price recommendation based on size, style, and color.
            </p>
            <p className="text-[11px] text-zinc-700 mb-5">No external API — instant calculation.</p>
            {genError && <p className="text-red-400 text-xs mb-4">{genError}</p>}
            <button
              onClick={handleGenerate}
              className="px-6 py-2.5 bg-[#D4A853] hover:bg-[#C49A3C] text-black text-sm font-semibold rounded-xl transition-colors"
            >
              Generate AI Quote
            </button>
          </div>
        )}

        {/* Generating */}
        {generating && (
          <div className="px-5 py-10 text-center">
            <div className="flex justify-center gap-1.5 mb-4">
              <span className="typing-dot" />
              <span className="typing-dot" style={{ animationDelay: "0.2s" }} />
              <span className="typing-dot" style={{ animationDelay: "0.4s" }} />
            </div>
            <p className="text-sm text-zinc-500">Calculating quote…</p>
          </div>
        )}

        {/* Quote draft / saved */}
        {displayDraft && !generating && (
          <div className="px-5 py-5 space-y-5">

            {/* AI Recommendation */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-3">
                Recommended
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#0d0d0d] border border-[#1E1E1E] rounded-xl px-4 py-3">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Price Range</p>
                  <p className="text-base font-bold text-[#D4A853]">
                    {fmtMoney(displayDraft.priceLow)} – {fmtMoney(displayDraft.priceHigh)}
                  </p>
                </div>
                <div className="bg-[#0d0d0d] border border-[#1E1E1E] rounded-xl px-4 py-3">
                  <p className="text-[10px] uppercase tracking-widests text-zinc-600 mb-1">Sessions</p>
                  <p className="text-base font-bold text-zinc-200">{displayDraft.sessions}</p>
                </div>
                <div className="bg-[#0d0d0d] border border-[#1E1E1E] rounded-xl px-4 py-3">
                  <p className="text-[10px] uppercase tracking-widests text-zinc-600 mb-1">Hours</p>
                  <p className="text-base font-bold text-zinc-200">{displayDraft.hoursRange}</p>
                </div>
                <div className="bg-[#0d0d0d] border border-[#1E1E1E] rounded-xl px-4 py-3">
                  <p className="text-[10px] uppercase tracking-widests text-zinc-600 mb-1">Difficulty</p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                      DIFFICULTY_COLORS[displayDraft.difficulty] ?? DIFFICULTY_COLORS.Medium
                    }`}
                  >
                    {displayDraft.difficulty}
                  </span>
                </div>
              </div>
            </div>

            {/* Reasoning */}
            <div className="bg-[#0d0d0d] border border-[#1E1E1E] rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-widests text-zinc-600 mb-2">Reasoning</p>
              <p className="text-sm text-zinc-400 leading-relaxed">{displayDraft.reasoning}</p>
            </div>

            {/* Divider */}
            <div className="border-t border-[#1A1A1A]" />

            {/* Artist's final fields */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-3">
                Artist&rsquo;s Final Quote
              </p>
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Final Price ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="25"
                      className={inputCls}
                      placeholder={`e.g. ${displayDraft.priceLow}`}
                      value={finalPrice}
                      onChange={(e) => setFinalPrice(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Session Count</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      className={inputCls}
                      placeholder={`e.g. ${displayDraft.sessions}`}
                      value={finalSessions}
                      onChange={(e) => setFinalSessions(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Notes for Client (optional)</label>
                  <textarea
                    rows={3}
                    className={`${inputCls} resize-none`}
                    placeholder="Any additional notes, conditions, or context for the client…"
                    value={quoteNotes}
                    onChange={(e) => setQuoteNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {saveError && (
              <p className="text-red-400 text-xs">{saveError}</p>
            )}

            <button
              onClick={handleSaveQuote}
              disabled={saving || !finalPrice}
              className="w-full py-3 rounded-xl bg-[#D4A853] hover:bg-[#C49A3C] text-black font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : quoteSaved ? "Update Quote" : "Save Quote"}
            </button>

            {quoteSaved && (
              <p className="text-center text-xs text-green-400">
                Quote saved — consultation status updated to Quoted.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Status management */}
      <div className="bg-[#111] border border-[#1E1E1E] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1A1A1A]">
          <p className="text-[10px] uppercase tracking-widest text-zinc-600">Update Status</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                disabled={isPending || status === opt.value}
                onClick={() => handleStatusChange(opt.value)}
                className={`text-xs px-3.5 py-1.5 rounded-full border transition-all ${
                  status === opt.value
                    ? opt.color
                    : "border-[#252525] text-zinc-600 hover:border-zinc-600 hover:text-zinc-400"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {statusError && <p className="text-red-400 text-xs">{statusError}</p>}
        </div>
      </div>

    </div>
  );
}
