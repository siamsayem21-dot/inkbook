"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  updateConsultationStatus,
  saveConsultationQuote,
  bookConsultation,
  startConsultationDeposit,
} from "@/app/book/[studio]/consult/actions";
import { sendDepositRequest } from "@/app/(owner)/owner/bookings/[bookingId]/actions";
import { formatDateTime } from "@/lib/utils";
import {
  STAGE_MAP,
  getStage,
  isAllowedStatusTransition,
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

type ArtistOption = { id: string; name: string };

type QuoteDraft = {
  priceLow:   number;
  priceHigh:  number;
  sessions:   number;
  hoursRange: string;
  difficulty: "Easy" | "Medium" | "Hard";
  reasoning:  string;
};

// ── Constants ─────────────────────────────────────────────────────────────────

// Display/validation order for this page's own "Update Status" control — New →
// Reviewed → Quoted → Deposit Paid → Booked → Completed → Lost. Deliberately a
// local override, not PIPELINE_STAGES' own array order (which drives the
// Pipeline board/dashboard and is left untouched); "lost" is appended since it's
// a same-tier exit reachable from any non-terminal stage, not a rung on the ladder.
const STATUS_DISPLAY_ORDER: LeadStatus[] = [
  "new", "reviewed", "quoted", "deposit_paid", "booked", "completed", "lost",
];
const STATUS_OPTIONS = STATUS_DISPLAY_ORDER.map((v) => STAGE_MAP[v]);

// Light-theme counterpart to PIPELINE_STAGES' dark badge classes — same mapping
// used by the consultations list page and the owner dashboard's Recent Consultations.
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

export default function ConsultationDetail({
  consult,
  bookingDepositAmountCents,
  bookingSummary,
}: {
  consult: ConsultRow;
  bookingDepositAmountCents?: number;
  bookingSummary?: { artistName: string; date: string | null; time: string | null } | null;
}) {
  const router = useRouter();

  // ── Status state ──────────────────────────────────────────────────────────
  const [status, setStatus]     = useState(consult.status);
  const [isPending, startTrans] = useTransition();
  const [statusError, setErr]   = useState<string | null>(null);

  // ── Book appointment state ────────────────────────────────────────────────
  const [artists, setArtists]         = useState<ArtistOption[]>([]);
  const [bookArtist, setBookArtist]   = useState(consult.artist_id ?? "");
  const [bookDate, setBookDate]       = useState("");
  const [bookTime, setBookTime]       = useState("");
  const [booking, setBooking]         = useState(false);
  const [bookError, setBookError]     = useState<string | null>(null);
  const [bookingId, setBookingId]     = useState(consult.booking_id ?? null);

  // ── Deposit link state ────────────────────────────────────────────────────
  const [depositLink, setDepositLink]           = useState<string | null>(null);
  const [depositLinkLoading, setDepositLoading] = useState(false);
  const [depositLinkError, setDepositError]     = useState<string | null>(null);
  const [copied, setCopied]                     = useState(false);

  useEffect(() => {
    fetch(`/api/artists?studioId=${consult.studio_id}`)
      .then((r) => r.json())
      .then((d) => setArtists(d.artists ?? []))
      .catch(() => {});
  }, [consult.studio_id]);

  async function handleBookAppointment() {
    setBookError(null);
    if (!bookArtist) { setBookError("Select an artist."); return; }
    if (!bookDate)   { setBookError("Select a date."); return; }
    if (!bookTime)   { setBookError("Select a time."); return; }
    setBooking(true);
    const result = await bookConsultation(consult.id, {
      artistId: bookArtist,
      date: bookDate,
      time: bookTime,
    });
    setBooking(false);
    if (result.error) { setBookError(result.error); return; }
    setBookingId(result.bookingId ?? null);
    router.refresh();
  }

  // ── Deposit link handlers ─────────────────────────────────────────────────

  async function handleGenerateDepositLink() {
    setDepositLoading(true);
    setDepositError(null);

    let targetBookingId = bookingId;
    if (!targetBookingId) {
      if (!bookArtist) {
        setDepositLoading(false);
        setDepositError("Select an artist first.");
        return;
      }
      // Creates (or, if this consultation already has one, reuses) a
      // provisional booking to attach the deposit payment to — consultation
      // status stays "quoted" until the webhook confirms payment.
      const provisional = await startConsultationDeposit(consult.id, bookArtist);
      if (provisional.error || !provisional.bookingId) {
        setDepositLoading(false);
        setDepositError(provisional.error ?? "Could not start deposit collection.");
        return;
      }
      targetBookingId = provisional.bookingId;
      setBookingId(targetBookingId);
    }

    const result = await sendDepositRequest(targetBookingId);
    setDepositLoading(false);
    if (result.error) { setDepositError(result.error); return; }
    setDepositLink(result.checkoutUrl ?? null);
  }

  function handleCopyLink() {
    if (!depositLink) return;
    navigator.clipboard.writeText(depositLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

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
  // Completed/Lost are terminal — normal workflow actions (booking, quote
  // editing, further status changes) are locked once a consultation gets here.
  const isTerminal = TERMINAL_STATUSES.has(currentStatusMeta.value);
  // The quote itself stops being an active workflow one step earlier — once a
  // deposit has been paid (Deposit Paid, Booked), the quote is settled and
  // shown read-only, same as the terminal states. saveConsultationQuote()
  // independently refuses writes for all of these server-side too.
  const quoteLocked = isTerminal || currentStatusMeta.value === "deposit_paid" || currentStatusMeta.value === "booked";
  // Data integrity: a deposit can't legitimately be requested before the quote
  // is finalized — startConsultationDeposit() enforces this server-side too.
  const hasFinalizedQuote = Boolean(consult.final_price && consult.final_price > 0);
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
      // Map AI field names → QuoteDraft shape used by the rest of the UI
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
    if (["new", "reviewed"].includes(status)) setStatus("quoted");
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

      {/* Terminal-state notice — Completed/Lost are read-only for normal workflow actions */}
      {isTerminal && (
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" />
          <p className="text-xs text-zinc-500">
            This consultation is <span className="font-medium text-zinc-700">{currentStatusMeta.label}</span> — booking and quote actions are locked. Quote details below are shown for reference only.
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

      {/* Book Appointment / Schedule Appointment — only once the deposit has
          actually been paid, and only until a real date/time is set. Covers
          two cases: (a) deposit was marked paid without a prior deposit-link
          booking (rare manual override) — bookConsultation() creates one
          outright; (b) the normal path — a provisional (awaiting_schedule)
          booking already exists from requesting the deposit below, and this
          just assigns it a date/time. Either way, once scheduled this section
          is replaced by the read-only "Appointment" summary instead. */}
      {status === "deposit_paid" && !isTerminal && (!bookingId || !bookingSummary?.date) && (
        <div className="bg-white border border-zinc-200 shadow-sm rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-100">
            <p className="text-[10px] uppercase tracking-widest text-zinc-400">Book Appointment</p>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Artist</label>
                <select
                  value={bookArtist}
                  onChange={(e) => setBookArtist(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Select artist…</option>
                  {artists.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Date</label>
                <input
                  type="date"
                  value={bookDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setBookDate(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Time</label>
                <input
                  type="time"
                  value={bookTime}
                  onChange={(e) => setBookTime(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
            {bookError && <p className="text-red-600 text-xs">{bookError}</p>}
            <button
              onClick={handleBookAppointment}
              disabled={booking}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {booking ? "Creating booking…" : "Confirm Appointment →"}
            </button>
          </div>
        </div>
      )}

      {/* Existing booking — read-only, once it actually has a date/time
          (before that, the Book/Schedule Appointment form above covers it) */}
      {bookingId && bookingSummary?.date && bookingSummary?.time && (
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

      {/* Deposit Paid — confirmation card (rare: deposit paid AND already
          scheduled at the same time; normally scheduling happens in a
          separate step above and advances straight to "Booked" instead) */}
      {status === "deposit_paid" && bookingSummary?.date && bookingSummary?.time && (
        <div className="bg-violet-50 border border-violet-100 rounded-xl px-5 py-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />
            <p className="text-sm font-semibold text-violet-700">Deposit Paid</p>
          </div>
          <p className="text-[11px] text-zinc-500 pl-5">
            {bookingDepositAmountCents
              ? `$${(bookingDepositAmountCents / 100).toFixed(2)} received — `
              : ""}
            Booking confirmed. Client will receive SMS &amp; email confirmation.
          </p>
        </div>
      )}

      {/* ── AI Quote Section ──────────────────────────────────────────────────── */}
      <div className="bg-white border border-zinc-200 shadow-sm rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <p className="text-[10px] uppercase tracking-widest text-zinc-400">
              {quoteLocked ? "Quote (Historical)" : "AI Quote"}
            </p>
            {quoteSaved && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                Saved
              </span>
            )}
          </div>
          {!quoteLocked && displayDraft && !generating && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="text-[10px] uppercase tracking-widest text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              Regenerate
            </button>
          )}
        </div>

        {quoteLocked ? (
          /* Read-only historical view — no active quote workflow once a
             deposit has been paid (Deposit Paid, Booked) or the consultation
             is Completed/Lost. Server-side, saveConsultationQuote()
             independently refuses writes for all of these, so this isn't
             just a hidden button — the write path itself is closed. */
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
              <p className="text-sm text-zinc-500">No quote was recorded before this deposit.</p>
            </div>
          )
        ) : (
          <>
            {/* No quote yet */}
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

                {/* Reasoning */}
                <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2">Reasoning</p>
                  <p className="text-sm text-zinc-600 leading-relaxed">{displayDraft.reasoning}</p>
                </div>

                {/* Divider */}
                <div className="border-t border-zinc-100" />

                {/* Artist's final fields */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-3">
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

      {/* Request deposit — the entry point into the Stripe flow from a Quoted
          consultation. Placed after the quote so the studio finalizes/reviews
          it before requesting a deposit. Creates (or reuses) a provisional,
          unscheduled booking purely to attach the deposit payment to —
          booking_id gets linked, but consultation status stays "quoted" until
          the webhook confirms payment (Quoted -> Deposit Paid). An artist
          must be picked up front since bookings.artist_id is required by the
          schema; once a booking already exists it's locked in and the picker
          disappears. A finalized quote (final_price) is required before a
          deposit can be requested — startConsultationDeposit() enforces this
          server-side too, so this is UI convenience, not the only guard. */}
      {status === "quoted" && !isTerminal && (
        <div className="bg-white border border-zinc-200 shadow-sm rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between gap-3">
            <p className="text-[10px] uppercase tracking-widest text-zinc-400">
              Deposit Collection
            </p>
          </div>

          <div className="px-5 py-4 space-y-4">
            {hasFinalizedQuote ? (
              <p className="text-xs text-zinc-500 leading-relaxed">
                Generate a secure payment link and share it with the client.
                The appointment can be scheduled once they pay.
              </p>
            ) : (
              <p className="text-xs text-amber-700 leading-relaxed">
                Save a final quote above before requesting a deposit.
              </p>
            )}

            {!bookingId && (
              <div>
                <label className={labelCls}>Artist</label>
                <select
                  value={bookArtist}
                  onChange={(e) => setBookArtist(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Select artist…</option>
                  {artists.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            )}

            {!depositLink ? (
              <div className="space-y-2">
                <button
                  onClick={handleGenerateDepositLink}
                  disabled={depositLinkLoading || (!bookingId && !bookArtist) || !hasFinalizedQuote}
                  className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {depositLinkLoading ? "Generating link…" : "Generate Deposit Link"}
                </button>
                {depositLinkError && (
                  <p className="text-red-600 text-xs">{depositLinkError}</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={depositLink}
                    className="flex-1 min-w-0 bg-zinc-50 border border-zinc-200 text-zinc-600 text-xs rounded-xl px-3 py-2.5 focus:outline-none truncate"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                      copied
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-violet-600 hover:bg-violet-700 text-white"
                    }`}
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className="text-[10px] text-zinc-400">
                  Send this link to the client via text or email. Expires in 24 hours.
                </p>
                <button
                  onClick={handleGenerateDepositLink}
                  disabled={depositLinkLoading}
                  className="text-[10px] text-zinc-400 hover:text-zinc-600 transition-colors disabled:opacity-40"
                >
                  {depositLinkLoading ? "Regenerating…" : "Regenerate link"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status management — Completed/Lost are terminal (whole control locked);
          otherwise only forward-or-lateral moves are clickable, mirroring the
          isAllowedStatusTransition() guard updateConsultationStatus() enforces
          server-side, so a click can't even attempt an illegal regression. */}
      <div className="bg-white border border-zinc-200 shadow-sm rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-100">
          <p className="text-[10px] uppercase tracking-widest text-zinc-400">Update Status</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((opt) => {
              const isCurrent = status === opt.value;
              const isLegal = isCurrent || (!isTerminal && isAllowedStatusTransition(status, opt.value));
              return (
                <button
                  key={opt.value}
                  disabled={isPending || isCurrent || !isLegal}
                  onClick={() => handleStatusChange(opt.value)}
                  title={!isLegal ? "This move isn't allowed from the current status." : undefined}
                  className={`text-xs px-3.5 py-1.5 rounded-full border transition-all ${
                    isCurrent
                      ? `border-transparent ${LIGHT_STAGE_BADGE[opt.value]}`
                      : "border-zinc-200 text-zinc-500 hover:border-violet-300 hover:text-zinc-700"
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          {isTerminal && (
            <p className="text-[11px] text-zinc-400">
              This consultation is closed — status can no longer be changed.
            </p>
          )}
          {statusError && <p className="text-red-600 text-xs">{statusError}</p>}
        </div>
      </div>

    </div>
  );
}
