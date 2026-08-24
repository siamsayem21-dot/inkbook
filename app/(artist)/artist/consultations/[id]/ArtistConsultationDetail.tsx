"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveArtistConsultationQuote } from "../actions";
import { formatDateTime } from "@/lib/utils";
import {
  getStage,
  TERMINAL_STATUSES,
  type LeadStatus,
} from "@/lib/pipeline";

// ── Types ─────────────────────────────────────────────────────────────────────

type ConsultRow = {
  id: string;
  studio_id: string;
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
  artist_id: string | null;
  booking_id: string | null;
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

const LIGHT_STAGE_BADGE: Record<LeadStatus, string> = {
  new:          "bg-blue-50 text-blue-700",
  reviewed:     "bg-yellow-50 text-yellow-700",
  quoted:       "bg-amber-50 text-amber-700",
  booked:       "bg-emerald-50 text-emerald-700",
  deposit_paid: "bg-violet-50 text-violet-700",
  completed:    "bg-green-50 text-green-700",
  lost:         "bg-zinc-100 text-zinc-500",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy:   "bg-green-50 text-green-700 border-green-200",
  Medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Hard:   "bg-red-50 text-red-700 border-red-200",
};

// Display-only "what happens next" copy, keyed to the canonical LIFECYCLE_ORDER
// (New -> Reviewed -> Quoted -> Deposit Paid -> Booked -> Completed). Deliberately
// NOT derived from STAGE_MAP's own `.next` field — that field follows
// PIPELINE_STAGES' own display order (quoted -> booked -> deposit_paid -> completed),
// which is a different order used for the Pipeline board, not this lifecycle.
const NEXT_ACTION_COPY: Record<LeadStatus, string> = {
  new:          "Review this consultation, then generate a quote.",
  reviewed:     "Generate and save a quote to move this forward.",
  quoted:       "Waiting on the studio to request a deposit from the client.",
  deposit_paid: "Waiting on an appointment to be scheduled.",
  booked:       "Appointment scheduled — awaiting the session.",
  completed:    "This consultation is complete.",
  lost:         "This consultation was marked lost.",
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
      <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-0.5">{label}</p>
      <p className="text-sm text-zinc-700">{value}</p>
    </div>
  );
}

const inputCls =
  "w-full bg-white border border-zinc-200 text-zinc-900 text-sm rounded-xl px-4 py-3 " +
  "placeholder-zinc-400 focus:outline-none focus:border-violet-400 transition-colors";

const labelCls = "block text-[10px] uppercase tracking-[0.13em] text-zinc-400 mb-1.5";

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ArtistConsultationDetail({
  consult,
  myArtistId,
  bookingDepositAmountCents,
  bookingSummary,
}: {
  consult: ConsultRow;
  myArtistId: string;
  bookingDepositAmountCents?: number;
  bookingSummary?: { artistName: string; date: string | null; time: string | null } | null;
}) {
  const router = useRouter();

  const status = consult.status;
  const currentStatusMeta = getStage(status);
  const isTerminal = TERMINAL_STATUSES.has(currentStatusMeta.value);
  const quoteLocked = isTerminal || currentStatusMeta.value === "deposit_paid" || currentStatusMeta.value === "booked";

  // Assignment: this artist may edit the quote only if the consultation is
  // unclaimed or already assigned to them — never one assigned to someone else.
  const assignedToSomeoneElse = Boolean(consult.artist_id && consult.artist_id !== myArtistId);
  const canEditQuote = !quoteLocked && !assignedToSomeoneElse;

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

  const confidence = Math.max(0, Math.min(100, Math.round(consult.style_confidence ?? 0)));

  const colorLabel =
    consult.color_preference === "color"      ? "Color"
    : consult.color_preference === "black_grey" ? "Black & Grey"
    : "Open to Both";

  const answeredQs = (consult.followup_questions ?? []).filter(
    (_, i) => (consult.followup_answers as Record<string, string>)[i]
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleGenerate() {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/ai/quote-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description:     consult.tattoo_description,
          placement:       consult.placement,
          size:            consult.estimated_size,
          colorPreference: consult.color_preference,
          budget:          consult.budget_range,
          style:           consult.detected_style,
          aiNotes:         consult.ai_notes,
          studioId:        consult.studio_id,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.json();
      const data: QuoteDraft = {
        priceLow:   raw.priceLow,
        priceHigh:  raw.priceHigh,
        sessions:   raw.sessionsEstimate,
        hoursRange: `${raw.hoursLow}–${raw.hoursHigh}`,
        difficulty: raw.difficulty,
        reasoning:  raw.reasoning,
      };
      setQuoteDraft(data);
      if (!finalPrice)    setFinalPrice(String(data.priceLow));
      if (!finalSessions) setFinalSessions(String(data.sessions));
      setQuoteSaved(false);
    } catch {
      setGenError("Could not generate AI quote. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveQuote() {
    if (!displayDraft) return;
    setSaving(true);
    setSaveError(null);
    const result = await saveArtistConsultationQuote(consult.id, {
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
    router.refresh();
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Title + status badge */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{consult.client_name}</h1>
          <p className="text-zinc-500 text-sm mt-0.5">{fmtDate(consult.created_at)}</p>
        </div>
        <span className={`text-xs px-3 py-1.5 rounded-full font-medium shrink-0 ${LIGHT_STAGE_BADGE[currentStatusMeta.value]}`}>
          {currentStatusMeta.label}
        </span>
      </div>

      {/* Current status + next valid action — read-only, artists don't change status */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 flex items-center gap-2.5">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" />
        <p className="text-xs text-zinc-600">{NEXT_ACTION_COPY[currentStatusMeta.value]}</p>
      </div>

      {assignedToSomeoneElse && (
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3">
          <p className="text-xs text-zinc-500">
            This consultation is assigned to another artist — shown for reference, quote editing is locked for you.
          </p>
        </div>
      )}

      {/* AI style detection */}
      {consult.detected_style && (
        <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-violet-400 mb-1">AI Detected Style</p>
              <p className="text-xl font-bold text-violet-700">{consult.detected_style}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1">Confidence</p>
              <p className="text-xl font-bold text-violet-700">{confidence}%</p>
            </div>
          </div>
          {confidence > 0 && (
            <div className="h-1 bg-violet-100 rounded-full overflow-hidden mb-3">
              <div className="h-full rounded-full bg-violet-500" style={{ width: `${confidence}%` }} />
            </div>
          )}
          {consult.style_reasoning && (
            <p className="text-sm text-zinc-600 italic">&ldquo;{consult.style_reasoning}&rdquo;</p>
          )}
        </div>
      )}

      {/* AI notes */}
      {consult.ai_notes && (
        <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2">AI Notes for Artist</p>
          <p className="text-sm text-zinc-700 leading-relaxed">{consult.ai_notes}</p>
        </div>
      )}

      {/* Client info */}
      <div className="bg-white border border-zinc-200 shadow-sm rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-100">
          <p className="text-[10px] uppercase tracking-widest text-zinc-400">Client Information</p>
        </div>
        <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Detail label="Name"  value={consult.client_name} />
          <Detail label="Email" value={consult.client_email} />
          <Detail label="Phone" value={consult.client_phone} />
        </div>
        <div className="px-5 py-2.5 border-t border-zinc-100 flex gap-3">
          <a href={`mailto:${consult.client_email}`} className="text-xs text-violet-600 hover:text-violet-700 transition-colors">
            Email Client →
          </a>
          <a href={`tel:${consult.client_phone}`} className="text-xs text-zinc-500 hover:text-zinc-700 transition-colors">
            Call →
          </a>
        </div>
      </div>

      {/* Project details */}
      <div className="bg-white border border-zinc-200 shadow-sm rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-100">
          <p className="text-[10px] uppercase tracking-widest text-zinc-400">Tattoo Project</p>
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
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1.5">Description</p>
            <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">
              {consult.tattoo_description}
            </p>
          </div>
        </div>
      </div>

      {/* Reference photos */}
      {consult.reference_photos?.length > 0 && (
        <div className="bg-white border border-zinc-200 shadow-sm rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-100">
            <p className="text-[10px] uppercase tracking-widest text-zinc-400">
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
                  className="w-20 h-20 object-cover rounded-lg border border-zinc-200 hover:border-violet-300 transition-colors"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Follow-up Q&A */}
      {answeredQs.length > 0 && (
        <div className="bg-white border border-zinc-200 shadow-sm rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-100">
            <p className="text-[10px] uppercase tracking-widest text-zinc-400">
              AI Follow-Up Answers ({answeredQs.length})
            </p>
          </div>
          <div className="px-5 py-4 space-y-4">
            {(consult.followup_questions ?? []).map((q, i) => {
              const answer = (consult.followup_answers as Record<string, string>)[i];
              if (!answer?.trim()) return null;
              return (
                <div key={i}>
                  <p className="text-[10px] text-zinc-400 mb-1 leading-relaxed">{q}</p>
                  <p className="text-sm text-zinc-700">{answer}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Existing booking — read-only summary, once it has a date/time */}
      {bookingSummary?.date && bookingSummary?.time && (
        <div className="bg-white border border-zinc-200 shadow-sm rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-100">
            <p className="text-[10px] uppercase tracking-widest text-zinc-400">Appointment</p>
          </div>
          <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Detail label="Artist" value={bookingSummary.artistName} />
            <Detail label="Date & Time" value={formatDateTime(bookingSummary.date, bookingSummary.time)} />
          </div>
        </div>
      )}

      {/* Deposit Paid — read-only banner */}
      {status === "deposit_paid" && (
        <div className="bg-violet-50 border border-violet-100 rounded-xl px-5 py-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />
            <p className="text-sm font-semibold text-violet-700">Deposit Paid</p>
          </div>
          <p className="text-[11px] text-zinc-500 pl-5">
            {bookingDepositAmountCents
              ? `$${(bookingDepositAmountCents / 100).toFixed(2)} received — `
              : ""}
            Waiting for the studio to schedule the appointment.
          </p>
        </div>
      )}

      {/* ── AI Quote Section ──────────────────────────────────────────────────── */}
      <div className="bg-white border border-zinc-200 shadow-sm rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <p className="text-[10px] uppercase tracking-widest text-zinc-400">
              {canEditQuote ? "AI Quote" : "Quote (Historical)"}
            </p>
            {quoteSaved && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                Saved
              </span>
            )}
          </div>
          {canEditQuote && displayDraft && !generating && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="text-[10px] uppercase tracking-widest text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              Regenerate
            </button>
          )}
        </div>

        {!canEditQuote ? (
          displayDraft || consult.final_price ? (
            <div className="px-5 py-5 space-y-5">
              {displayDraft && (
                <>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-3">Recommended</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3">
                        <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1">Price Range</p>
                        <p className="text-base font-bold text-zinc-700">
                          {fmtMoney(displayDraft.priceLow)} – {fmtMoney(displayDraft.priceHigh)}
                        </p>
                      </div>
                      <div className="bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3">
                        <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1">Sessions</p>
                        <p className="text-base font-bold text-zinc-700">{displayDraft.sessions}</p>
                      </div>
                      <div className="bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3">
                        <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1">Hours</p>
                        <p className="text-base font-bold text-zinc-700">{displayDraft.hoursRange}</p>
                      </div>
                      <div className="bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3">
                        <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1">Difficulty</p>
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
                  {displayDraft.reasoning && (
                    <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-4">
                      <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2">Reasoning</p>
                      <p className="text-sm text-zinc-600 leading-relaxed">{displayDraft.reasoning}</p>
                    </div>
                  )}
                  <div className="border-t border-zinc-100" />
                </>
              )}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-3">Final Quote</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Detail label="Final Price" value={consult.final_price ? fmtMoney(consult.final_price) : "—"} />
                  <Detail label="Session Count" value={consult.final_sessions ? String(consult.final_sessions) : "—"} />
                </div>
                {consult.quote_notes && (
                  <div className="mt-4">
                    <Detail label="Notes for Client" value={consult.quote_notes} />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-zinc-500">No quote was recorded.</p>
            </div>
          )
        ) : (
          <>
            {!displayDraft && !generating && (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-zinc-500 mb-1 leading-relaxed">
                  Generate a price recommendation based on size, style, and color.
                </p>
                <p className="text-[11px] text-zinc-400 mb-5">No external API — instant calculation.</p>
                {genError && <p className="text-red-600 text-xs mb-4">{genError}</p>}
                <button
                  onClick={handleGenerate}
                  className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  Generate AI Quote
                </button>
              </div>
            )}

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

            {displayDraft && !generating && (
              <div className="px-5 py-5 space-y-5">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-3">
                    Recommended
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3">
                      <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1">Price Range</p>
                      <p className="text-base font-bold text-violet-700">
                        {fmtMoney(displayDraft.priceLow)} – {fmtMoney(displayDraft.priceHigh)}
                      </p>
                    </div>
                    <div className="bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3">
                      <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1">Sessions</p>
                      <p className="text-base font-bold text-zinc-800">{displayDraft.sessions}</p>
                    </div>
                    <div className="bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3">
                      <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1">Hours</p>
                      <p className="text-base font-bold text-zinc-800">{displayDraft.hoursRange}</p>
                    </div>
                    <div className="bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3">
                      <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1">Difficulty</p>
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

                <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2">Reasoning</p>
                  <p className="text-sm text-zinc-600 leading-relaxed">{displayDraft.reasoning}</p>
                </div>

                <div className="border-t border-zinc-100" />

                <div>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-3">
                    Artist&rsquo;s Final Quote
                  </p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="artist-quote-final-price" className={labelCls}>Final Price ($)</label>
                        <input
                          id="artist-quote-final-price"
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
                        <label htmlFor="artist-quote-final-sessions" className={labelCls}>Session Count</label>
                        <input
                          id="artist-quote-final-sessions"
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
                      <label htmlFor="artist-quote-notes" className={labelCls}>Notes for Client (optional)</label>
                      <textarea
                        id="artist-quote-notes"
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
                  <p className="text-red-600 text-xs">{saveError}</p>
                )}

                <button
                  onClick={handleSaveQuote}
                  disabled={saving || !finalPrice}
                  className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving…" : quoteSaved ? "Update Quote" : "Save Quote"}
                </button>

                {quoteSaved && (
                  <p className="text-center text-xs text-green-700">
                    Quote saved — consultation status updated to Quoted.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}
