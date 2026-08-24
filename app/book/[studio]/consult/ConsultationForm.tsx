"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { submitConsultation } from "./actions";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const SIZES = [
  "Small (under 2\")",
  "Medium (2–4\")",
  "Large (4–8\")",
  "Extra Large (8\"+)",
  "Half Sleeve",
  "Full Sleeve",
  "Full Back",
];

const BUDGETS = [
  "Under $200",
  "$200–$500",
  "$500–$1,000",
  "$1,000–$2,000",
  "$2,000+",
  "Flexible — let artist quote",
];

const STYLES = [
  "Traditional",
  "Neo Traditional",
  "Japanese",
  "Fine Line",
  "Blackwork",
  "Realism",
  "Floral",
  "Geometric",
  "Tribal",
  "Watercolor",
  "Other",
];

const STEP_LABELS = [
  "Contact",
  "Vision",
  "Follow-Up",
  "Style",
  "Review",
];

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type VisibleStep = 1 | 2 | 3 | 4 | 5;
type Step = VisibleStep | 6; // 6 = success

interface FormData {
  name: string;
  email: string;
  phone: string;
  description: string;
  placement: string;
  size: string;
  colorPref: "color" | "black_grey" | "open";
  budget: string;
  questions: string[];
  answers: Record<number, string>;
  detectedStyle: string;
  styleConfidence: number;
  styleReasoning: string;
  styleOverride: string;
  aiNotes: string;
}

const DEFAULT: FormData = {
  name: "", email: "", phone: "",
  description: "", placement: "", size: "", colorPref: "open", budget: "",
  questions: [], answers: {},
  detectedStyle: "", styleConfidence: 0, styleReasoning: "", styleOverride: "", aiNotes: "",
};

type FieldErrors = Partial<Record<keyof FormData | "_general", string>>;

interface Props {
  studioSlug: string;
  studioId: string;
  studioName: string;
  primaryColor: string;
  textOnBrand: string;
}

// ─────────────────────────────────────────────
// Shared field styles
// ─────────────────────────────────────────────

const inputCls =
  "w-full bg-[#0a0a0a] border border-[#252525] text-white text-sm rounded-xl px-4 py-3 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors";

const labelCls = "block text-[10px] uppercase tracking-[0.13em] text-zinc-500 mb-1.5";

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-red-400 text-xs mt-1.5">{msg}</p>;
}

// ─────────────────────────────────────────────
// Progress Indicator
// ─────────────────────────────────────────────

function ProgressIndicator({ step }: { step: VisibleStep }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEP_LABELS.map((label, i) => {
        const stepNum = (i + 1) as VisibleStep;
        const done    = stepNum < step;
        const active  = stepNum === step;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                  done   ? "bg-[#D4A853] text-black"
                  : active ? "bg-[#D4A853]/15 border border-[#D4A853] text-[#D4A853]"
                  : "bg-[#111] border border-[#2A2A2A] text-zinc-600"
                }`}
              >
                {done ? "✓" : stepNum}
              </div>
              <span className={`text-[9px] uppercase tracking-wider hidden sm:block ${
                active ? "text-[#D4A853]" : done ? "text-zinc-500" : "text-zinc-700"
              }`}>
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={`w-8 sm:w-12 h-px mx-1 mb-4 ${done ? "bg-[#D4A853]/50" : "bg-[#252525]"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// Color Preference Cards
// ─────────────────────────────────────────────

function ColorPrefCards({
  value,
  onChange,
}: {
  value: "color" | "black_grey" | "open";
  onChange: (v: "color" | "black_grey" | "open") => void;
}) {
  const options: { value: "color" | "black_grey" | "open"; label: string; sub: string }[] = [
    { value: "color",    label: "Color",         sub: "Vibrant, multi-color" },
    { value: "black_grey", label: "Black & Grey", sub: "Shading & contrast" },
    { value: "open",     label: "Open to Both",  sub: "Artist's preference" },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`p-3 rounded-xl border text-left transition-all ${
            value === opt.value
              ? "border-[#D4A853] bg-[#D4A853]/08 text-[#D4A853]"
              : "border-[#252525] bg-[#0a0a0a] text-zinc-400 hover:border-zinc-600"
          }`}
        >
          <p className="text-xs font-semibold leading-tight">{opt.label}</p>
          <p className="text-[10px] text-zinc-600 mt-0.5 leading-tight">{opt.sub}</p>
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Step 1 — Contact Info
// ─────────────────────────────────────────────

function Step1({
  data, errors, update, onNext, primaryColor,
}: {
  data: FormData;
  errors: FieldErrors;
  update: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
  onNext: () => void;
  primaryColor: string;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-cinzel text-xl font-bold tracking-wide mb-1">Your Information</h2>
        <p className="text-zinc-500 text-sm">We&apos;ll use this to send you updates and contact you about your consultation.</p>
      </div>
      <div className="space-y-4">
        <div>
          <label htmlFor="consult-name" className={labelCls}>Full Name *</label>
          <input
            id="consult-name"
            type="text"
            className={inputCls}
            placeholder="Alex Johnson"
            value={data.name}
            onChange={(e) => update("name", e.target.value)}
          />
          <FieldError msg={errors.name} />
        </div>
        <div>
          <label htmlFor="consult-email" className={labelCls}>Email Address *</label>
          <input
            id="consult-email"
            type="email"
            className={inputCls}
            placeholder="alex@example.com"
            value={data.email}
            onChange={(e) => update("email", e.target.value)}
          />
          <FieldError msg={errors.email} />
        </div>
        <div>
          <label htmlFor="consult-phone" className={labelCls}>Phone Number *</label>
          <input
            id="consult-phone"
            type="tel"
            className={inputCls}
            placeholder="+1 (555) 000-0000"
            value={data.phone}
            onChange={(e) => update("phone", e.target.value)}
          />
          <FieldError msg={errors.phone} />
        </div>
      </div>
      <button
        type="button"
        onClick={onNext}
        className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all"
        style={{ background: primaryColor, color: "#000" }}
      >
        Continue — Tell Us Your Vision →
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Step 2 — Tattoo Vision
// ─────────────────────────────────────────────

function Step2({
  data, errors, update, photoPreviewUrls, fileInputRef, onPhotoSelect, onRemovePhoto, onBack, onNext,
}: {
  data: FormData;
  errors: FieldErrors;
  update: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
  photoPreviewUrls: string[];
  fileInputRef: React.RefObject<HTMLInputElement>;
  onPhotoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: (i: number) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-cinzel text-xl font-bold tracking-wide mb-1">Your Vision</h2>
        <p className="text-zinc-500 text-sm">Describe what you have in mind — be as specific as you like.</p>
      </div>
      <div className="space-y-4">
        <div>
          <label htmlFor="consult-description" className={labelCls}>Tattoo Description *</label>
          <textarea
            id="consult-description"
            className={`${inputCls} resize-none`}
            rows={4}
            placeholder="Describe your tattoo idea in detail. What imagery, theme, or concept are you going for? The more you share, the better we can prepare."
            value={data.description}
            onChange={(e) => update("description", e.target.value)}
          />
          <div className="flex items-center justify-between mt-1">
            <FieldError msg={errors.description} />
            <span className="text-[10px] text-zinc-700 ml-auto">{data.description.length} chars</span>
          </div>
        </div>
        <div>
          <label htmlFor="consult-placement" className={labelCls}>Placement *</label>
          <input
            id="consult-placement"
            type="text"
            className={inputCls}
            placeholder="e.g. Left forearm, right shoulder blade, full sleeve..."
            value={data.placement}
            onChange={(e) => update("placement", e.target.value)}
          />
          <FieldError msg={errors.placement} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="consult-size" className={labelCls}>Estimated Size *</label>
            <select
              id="consult-size"
              className={`${inputCls} cursor-pointer`}
              value={data.size}
              onChange={(e) => update("size", e.target.value)}
            >
              <option value="">Select size...</option>
              {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <FieldError msg={errors.size} />
          </div>
          <div>
            <label htmlFor="consult-budget" className={labelCls}>Budget Range *</label>
            <select
              id="consult-budget"
              className={`${inputCls} cursor-pointer`}
              value={data.budget}
              onChange={(e) => update("budget", e.target.value)}
            >
              <option value="">Select budget...</option>
              {BUDGETS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <FieldError msg={errors.budget} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Color Preference</label>
          <ColorPrefCards value={data.colorPref} onChange={(v) => update("colorPref", v)} />
        </div>
        <div>
          <label htmlFor="consult-reference-images" className={labelCls}>Reference Images (optional, up to 5)</label>
          <div className="space-y-3">
            {photoPreviewUrls.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {photoPreviewUrls.map((url, i) => (
                  <div key={i} className="relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Reference ${i + 1}`}
                      className="w-20 h-20 object-cover rounded-lg border border-[#252525]"
                    />
                    <button
                      type="button"
                      onClick={() => onRemovePhoto(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            {photoPreviewUrls.length < 5 && (
              <>
                <input
                  id="consult-reference-images"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={onPhotoSelect}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border border-dashed border-[#303030] rounded-xl py-5 text-center text-zinc-600 hover:border-zinc-500 hover:text-zinc-400 transition-colors"
                >
                  <span className="block text-xl mb-1">+</span>
                  <span className="text-xs">Click to add reference photos</span>
                  <span className="block text-[10px] text-zinc-700 mt-0.5">
                    {5 - photoPreviewUrls.length} remaining · JPG, PNG, WEBP · max 8MB each
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-3.5 rounded-xl border border-[#252525] text-zinc-400 hover:text-white text-sm transition-colors"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex-1 py-3.5 rounded-xl bg-[#D4A853] hover:bg-[#C49A3C] text-black font-semibold text-sm transition-colors"
        >
          Analyze with AI →
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Step 3 — AI Follow-Up Questions
// ─────────────────────────────────────────────

function Step3({
  data, update, onBack, onNext,
}: {
  data: FormData;
  update: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#D4A853]/10 border border-[#D4A853]/20 rounded-full mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D4A853]" />
          <span className="text-[10px] uppercase tracking-widest text-[#D4A853]">AI Generated</span>
        </div>
        <h2 className="font-cinzel text-xl font-bold tracking-wide mb-1">A Few Questions</h2>
        <p className="text-zinc-500 text-sm">
          Based on your vision, the AI has a few follow-up questions. Answer as many as you like — all are optional.
        </p>
      </div>
      <div className="space-y-4">
        {data.questions.map((question, i) => (
          <div key={i} className="bg-[#0d0d0d] border border-[#1E1E1E] rounded-xl p-4">
            <label htmlFor={`consult-followup-${i}`} className="block text-sm text-zinc-300 mb-2 leading-relaxed">
              <span className="text-[#D4A853] text-xs mr-2">{i + 1}.</span>
              {question}
            </label>
            <input
              id={`consult-followup-${i}`}
              type="text"
              className={inputCls}
              placeholder="Your answer (optional)..."
              value={data.answers[i] ?? ""}
              onChange={(e) => {
                const next = { ...data.answers, [i]: e.target.value };
                update("answers", next);
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-3.5 rounded-xl border border-[#252525] text-zinc-400 hover:text-white text-sm transition-colors"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex-1 py-3.5 rounded-xl bg-[#D4A853] hover:bg-[#C49A3C] text-black font-semibold text-sm transition-colors"
        >
          Detect My Style →
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Step 4 — Style Detection
// ─────────────────────────────────────────────

function Step4({
  data, update, onBack, onNext,
}: {
  data: FormData;
  update: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const confidence = Math.max(0, Math.min(100, Math.round(data.styleConfidence)));
  const confColor  = confidence >= 80 ? "#4ADE80" : confidence >= 60 ? "#D4A853" : "#F87171";

  return (
    <div className="space-y-5">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#D4A853]/10 border border-[#D4A853]/20 rounded-full mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D4A853]" />
          <span className="text-[10px] uppercase tracking-widest text-[#D4A853]">Style Analysis</span>
        </div>
        <h2 className="font-cinzel text-xl font-bold tracking-wide mb-1">AI Style Detection</h2>
        <p className="text-zinc-500 text-sm">
          The AI analyzed your vision and detected the best matching style. You can override this below.
        </p>
      </div>

      {/* Detection result */}
      <div className="bg-[#0d0d0d] border border-[#1E1E1E] rounded-xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Detected Style</p>
            <p className="font-cinzel text-2xl font-bold text-white">{data.detectedStyle || "Other"}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Confidence</p>
            <p className="text-2xl font-bold" style={{ color: confColor }}>{confidence}%</p>
          </div>
        </div>

        {/* Confidence bar */}
        <div className="h-1.5 bg-[#1E1E1E] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${confidence}%`, background: confColor }}
          />
        </div>

        {data.styleReasoning && (
          <p className="text-sm text-zinc-400 italic leading-relaxed">&ldquo;{data.styleReasoning}&rdquo;</p>
        )}
      </div>

      {/* Style override */}
      <div>
        <label htmlFor="consult-style-override" className={labelCls}>Override Style (optional)</label>
        <select
          id="consult-style-override"
          className={`${inputCls} cursor-pointer`}
          value={data.styleOverride || data.detectedStyle}
          onChange={(e) => update("styleOverride", e.target.value)}
        >
          {STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <p className="text-[10px] text-zinc-700 mt-1.5">
          If the detected style doesn&apos;t match your vision, select the correct one.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-3.5 rounded-xl border border-[#252525] text-zinc-400 hover:text-white text-sm transition-colors"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex-1 py-3.5 rounded-xl bg-[#D4A853] hover:bg-[#C49A3C] text-black font-semibold text-sm transition-colors"
        >
          Review Summary →
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Step 5 — Summary + Submit
// ─────────────────────────────────────────────

function Step5({
  data, photoPreviewUrls, onBack, onSubmit, submitting, error,
}: {
  data: FormData;
  photoPreviewUrls: string[];
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const finalStyle = data.styleOverride || data.detectedStyle || "Not determined";
  const colorLabel = data.colorPref === "color" ? "Color" : data.colorPref === "black_grey" ? "Black & Grey" : "Open to Both";

  const answeredQs = data.questions.filter((_, i) => data.answers[i]?.trim());

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-cinzel text-xl font-bold tracking-wide mb-1">Review Your Consultation</h2>
        <p className="text-zinc-500 text-sm">
          Everything looks good? Submit to send your consultation to the studio.
        </p>
      </div>

      {/* Client info */}
      <div className="bg-[#0d0d0d] border border-[#1E1E1E] rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#1A1A1A]">
          <p className="text-[10px] uppercase tracking-widest text-zinc-600">Client</p>
        </div>
        <div className="px-4 py-3 grid grid-cols-2 gap-3">
          <SummaryField label="Name"  value={data.name} />
          <SummaryField label="Email" value={data.email} />
          <SummaryField label="Phone" value={data.phone} />
        </div>
      </div>

      {/* Project */}
      <div className="bg-[#0d0d0d] border border-[#1E1E1E] rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#1A1A1A]">
          <p className="text-[10px] uppercase tracking-widest text-zinc-600">Tattoo Project</p>
        </div>
        <div className="px-4 py-3 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <SummaryField label="Style"     value={finalStyle} highlight />
            <SummaryField label="Placement" value={data.placement} />
            <SummaryField label="Size"      value={data.size} />
            <SummaryField label="Color"     value={colorLabel} />
            <SummaryField label="Budget"    value={data.budget} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Description</p>
            <p className="text-sm text-zinc-300 leading-relaxed">{data.description}</p>
          </div>
        </div>
      </div>

      {/* Photos */}
      {photoPreviewUrls.length > 0 && (
        <div className="bg-[#0d0d0d] border border-[#1E1E1E] rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[#1A1A1A]">
            <p className="text-[10px] uppercase tracking-widest text-zinc-600">
              Reference Photos ({photoPreviewUrls.length})
            </p>
          </div>
          <div className="px-4 py-3 flex flex-wrap gap-2">
            {photoPreviewUrls.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={url} alt={`Ref ${i + 1}`}
                className="w-16 h-16 object-cover rounded-lg border border-[#252525]"
              />
            ))}
          </div>
        </div>
      )}

      {/* AI follow-up answers */}
      {answeredQs.length > 0 && (
        <div className="bg-[#0d0d0d] border border-[#1E1E1E] rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[#1A1A1A]">
            <p className="text-[10px] uppercase tracking-widest text-zinc-600">Follow-Up Answers</p>
          </div>
          <div className="px-4 py-3 space-y-3">
            {data.questions.map((q, i) =>
              data.answers[i]?.trim() ? (
                <div key={i}>
                  <p className="text-[10px] text-zinc-600 mb-0.5">{q}</p>
                  <p className="text-sm text-zinc-300">{data.answers[i]}</p>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* AI notes */}
      {data.aiNotes && (
        <div className="bg-[#D4A853]/05 border border-[#D4A853]/20 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-widest text-[#D4A853]/70 mb-2">AI Notes for Artist</p>
          <p className="text-sm text-zinc-300 leading-relaxed">{data.aiNotes}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="px-5 py-3.5 rounded-xl border border-[#252525] text-zinc-400 hover:text-white text-sm transition-colors disabled:opacity-40"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="flex-1 py-3.5 rounded-xl bg-[#D4A853] hover:bg-[#C49A3C] text-black font-bold text-sm transition-colors disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit Consultation ✓"}
        </button>
      </div>
    </div>
  );
}

function SummaryField({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-0.5">{label}</p>
      <p className={`text-sm font-medium ${highlight ? "text-[#D4A853]" : "text-zinc-300"}`}>{value}</p>
    </div>
  );
}

// ─────────────────────────────────────────────
// Step 6 — Success
// ─────────────────────────────────────────────

function SuccessScreen({
  name, consultationId, studioName, primaryColor,
}: {
  name: string;
  consultationId: string | null;
  studioName: string;
  primaryColor: string;
  textOnBrand: string;
}) {
  return (
    <div className="text-center py-6">
      <div
        className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center text-2xl"
        style={{ background: `${primaryColor}20`, border: `1px solid ${primaryColor}40` }}
      >
        ✓
      </div>
      <h2 className="font-cinzel text-2xl font-bold tracking-wide mb-2">Consultation Submitted!</h2>
      <p className="text-zinc-400 text-sm leading-relaxed mb-6 max-w-sm mx-auto">
        Thank you, {name.split(" ")[0]}. Your consultation has been sent to {studioName} and they will review it shortly.
      </p>
      {consultationId && (
        <div className="bg-[#0d0d0d] border border-[#1E1E1E] rounded-xl px-4 py-3 mb-6 max-w-xs mx-auto">
          <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Consultation Reference</p>
          <p className="text-xs font-mono text-zinc-400">{consultationId}</p>
        </div>
      )}
      <div className="bg-[#0d0d0d] border border-[#1E1E1E] rounded-xl p-4 max-w-sm mx-auto text-left space-y-2.5">
        <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-3">What happens next</p>
        {[
          "The studio reviews your consultation within 1-2 business days",
          "You'll receive a quote and deposit request by email",
          "Once you approve and pay the deposit, your appointment is confirmed",
        ].map((step, i) => (
          <div key={i} className="flex gap-2.5">
            <span className="text-[#D4A853] text-xs mt-0.5 shrink-0">{i + 1}.</span>
            <p className="text-sm text-zinc-400 leading-relaxed">{step}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// AI Loading Overlay
// ─────────────────────────────────────────────

function AiLoadingOverlay({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center px-6">
      <div className="text-center max-w-xs">
        <div className="flex justify-center gap-1.5 mb-5">
          <span className="typing-dot" />
          <span className="typing-dot" style={{ animationDelay: "0.2s" }} />
          <span className="typing-dot" style={{ animationDelay: "0.4s" }} />
        </div>
        <p className="text-sm text-zinc-300 leading-relaxed">{message}</p>
        <p className="text-[11px] text-zinc-600 mt-2">This takes a few seconds...</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export default function ConsultationForm({
  studioSlug, studioId, studioName, primaryColor, textOnBrand,
}: Props) {
  const [step, setStep]                   = useState<Step>(1);
  const [formData, setFormData]           = useState<FormData>(DEFAULT);
  const [photoFiles, setPhotoFiles]       = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoUrls]  = useState<string[]>([]);
  const [aiLoading, setAiLoading]         = useState(false);
  const [aiLoadingMsg, setAiLoadingMsg]   = useState("");
  const [submitting, setSubmitting]       = useState(false);
  const [submitError, setSubmitError]     = useState<string | null>(null);
  const [consultationId, setConsultId]    = useState<string | null>(null);
  const [errors, setErrors]               = useState<FieldErrors>({});
  const fileInputRef                      = useRef<HTMLInputElement>(null);
  const DRAFT_KEY                         = `consult_draft_${studioSlug}`;

  // Load draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.data) {
        setFormData((d) => ({ ...d, ...parsed.data }));
        if (parsed.step && parsed.step <= 2) setStep(parsed.step);
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Revoke object URLs on unmount
  useEffect(() => {
    const urls = [...photoPreviewUrls];
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveDraft = useCallback(
    (updates: Partial<FormData>, toStep?: number) => {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ step: toStep ?? step, data: { ...formData, ...updates } })
        );
      } catch {}
    },
    [DRAFT_KEY, step, formData]
  );

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setFormData((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  // ─── Validation ───
  function validateStep1(): boolean {
    const errs: FieldErrors = {};
    if (!formData.name.trim())  errs.name  = "Name is required";
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      errs.email = "Valid email is required";
    if (!formData.phone.trim()) errs.phone = "Phone is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateStep2(): boolean {
    const errs: FieldErrors = {};
    if (!formData.description.trim() || formData.description.trim().length < 20)
      errs.description = "Please describe your tattoo idea (at least 20 characters)";
    if (!formData.placement.trim()) errs.placement = "Placement is required";
    if (!formData.size)             errs.size      = "Please select a size";
    if (!formData.budget)           errs.budget    = "Please select a budget range";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ─── Transitions ───
  async function goToStep3() {
    if (!validateStep2()) return;
    saveDraft({}, 2);
    setAiLoading(true);
    setAiLoadingMsg("AI is crafting follow-up questions based on your vision...");
    try {
      const res = await fetch("/api/ai/consultation-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: formData.description,
          placement:   formData.placement,
          size:        formData.size,
          colorPreference: formData.colorPref,
          budgetRange: formData.budget,
          studioId,
        }),
      });
      const json = await res.json();
      const questions: string[] = json.questions ?? [];
      setFormData((d) => ({ ...d, questions }));
      saveDraft({ questions }, 3);
      setStep(3);
    } catch {
      const fallback = [
        "Do you have any existing tattoos in or near this area?",
        "Are you open to a custom design, or working from a specific reference?",
        "What is your preferred timeline for this piece?",
        "Is there any personal meaning behind this tattoo?",
        "How flexible are you on the final design details?",
      ];
      setFormData((d) => ({ ...d, questions: fallback }));
      setStep(3);
    } finally {
      setAiLoading(false);
    }
  }

  async function goToStep4() {
    setAiLoading(true);
    setAiLoadingMsg("AI is analyzing your style preferences and crafting your profile...");
    const answersMap: Record<string, string> = {};
    formData.questions.forEach((q, i) => {
      if (formData.answers[i]?.trim()) answersMap[q] = formData.answers[i];
    });
    try {
      const res = await fetch("/api/ai/style-detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description:    formData.description,
          placement:      formData.placement,
          size:           formData.size,
          colorPreference: formData.colorPref === "color" ? "Color"
            : formData.colorPref === "black_grey" ? "Black & Grey"
            : "Open to both",
          followupAnswers: answersMap,
          studioId,
        }),
      });
      const result = await res.json();
      setFormData((d) => ({
        ...d,
        detectedStyle:    result.style        ?? "Other",
        styleConfidence:  result.confidence   ?? 70,
        styleReasoning:   result.reasoning    ?? "",
        styleOverride:    result.style        ?? "Other",
        aiNotes:          result.aiNotes      ?? "",
      }));
      setStep(4);
    } catch {
      setFormData((d) => ({
        ...d,
        detectedStyle: "Other", styleConfidence: 50,
        styleReasoning: "Please select your preferred style.",
        styleOverride: "Other",
        aiNotes: "Style to be confirmed with artist.",
      }));
      setStep(4);
    } finally {
      setAiLoading(false);
    }
  }

  // ─── Submit ───
  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    const fd = new globalThis.FormData();
    fd.append("studioId",        studioId);
    fd.append("studioSlug",      studioSlug);
    fd.append("clientName",      formData.name);
    fd.append("clientEmail",     formData.email);
    fd.append("clientPhone",     formData.phone);
    fd.append("description",     formData.description);
    fd.append("placement",       formData.placement);
    fd.append("size",            formData.size);
    fd.append("colorPreference", formData.colorPref);
    fd.append("budgetRange",     formData.budget);
    fd.append("questions",       JSON.stringify(formData.questions));
    fd.append("answers",         JSON.stringify(formData.answers));
    fd.append("detectedStyle",   formData.styleOverride || formData.detectedStyle);
    fd.append("styleConfidence", String(formData.styleConfidence));
    fd.append("styleReasoning",  formData.styleReasoning);
    fd.append("aiNotes",         formData.aiNotes);
    photoFiles.forEach((f) => fd.append("photos", f));
    try {
      const result = await submitConsultation(fd);
      if (result.error) {
        setSubmitError(result.error);
      } else {
        setConsultId(result.id ?? null);
        try { localStorage.removeItem(DRAFT_KEY); } catch {}
        setStep(6);
      }
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Photo handlers ───
  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 5 - photoFiles.length);
    const urls  = files.map((f) => URL.createObjectURL(f));
    setPhotoFiles((prev) => [...prev, ...files]);
    setPhotoUrls((prev)  => [...prev, ...urls]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removePhoto(i: number) {
    URL.revokeObjectURL(photoPreviewUrls[i]);
    setPhotoFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPhotoUrls((prev)  => prev.filter((_, idx) => idx !== i));
  }

  // ─── Render ───
  if (step === 6) {
    return (
      <SuccessScreen
        name={formData.name}
        consultationId={consultationId}
        studioName={studioName}
        primaryColor={primaryColor}
        textOnBrand={textOnBrand}
      />
    );
  }

  return (
    <div className="relative">
      {aiLoading && <AiLoadingOverlay message={aiLoadingMsg} />}

      <ProgressIndicator step={step as VisibleStep} />

      {step === 1 && (
        <Step1
          data={formData}
          errors={errors}
          update={update}
          primaryColor={primaryColor}
          onNext={() => {
            if (validateStep1()) { saveDraft({}, 1); setStep(2); }
          }}
        />
      )}

      {step === 2 && (
        <Step2
          data={formData}
          errors={errors}
          update={update}
          photoPreviewUrls={photoPreviewUrls}
          fileInputRef={fileInputRef as React.RefObject<HTMLInputElement>}
          onPhotoSelect={handlePhotoSelect}
          onRemovePhoto={removePhoto}
          onBack={() => setStep(1)}
          onNext={goToStep3}
        />
      )}

      {step === 3 && (
        <Step3
          data={formData}
          update={update}
          onBack={() => setStep(2)}
          onNext={goToStep4}
        />
      )}

      {step === 4 && (
        <Step4
          data={formData}
          update={update}
          onBack={() => setStep(3)}
          onNext={() => setStep(5)}
        />
      )}

      {step === 5 && (
        <Step5
          data={formData}
          photoPreviewUrls={photoPreviewUrls}
          onBack={() => setStep(4)}
          onSubmit={handleSubmit}
          submitting={submitting}
          error={submitError}
        />
      )}
    </div>
  );
}
