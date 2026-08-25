"use client";

import { useState, useRef, useMemo } from "react";
import Link from "next/link";
import { submitCustomRequest } from "./actions";

interface Artist {
  id: string;
  name: string;
}

interface Props {
  studioSlug:   string;
  studioId:     string;
  studioName:   string;
  artists:      Artist[];
  primaryColor: string;
  textOnBrand:  string;
}

const STYLES = [
  "Blackwork", "Fine Line", "Traditional", "Neo-Traditional",
  "Watercolor", "Geometric", "Realism", "Japanese", "Tribal", "Other",
];

const SIZES = [
  "Small (under 2\")",
  "Medium (2–4\")",
  "Large (4–6\")",
  "Extra Large (6\"+)",
];

const BUDGETS = ["$100–200", "$200–400", "$400–600", "$600–1,000", "$1,000+"];

const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ACCEPTED = "image/jpeg,image/jpg,image/png,image/webp";

type Step = 1 | 2 | 3;

const STEP_LABELS = ["About You", "Your Idea", "Final Details"] as const;

type FormFields = {
  clientName:       string;
  clientEmail:      string;
  clientPhone:      string;
  artistId:         string;
  style:            string;
  placement:        string;
  size:             string;
  budgetRange:      string;
  description:      string;
  availabilityNote: string;
};

function validateStep1(f: FormFields) {
  const e: Partial<Record<keyof FormFields, string>> = {};
  if (f.clientName.trim().length < 2) e.clientName = "Name must be at least 2 characters";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.clientEmail)) e.clientEmail = "Enter a valid email address";
  if (!f.clientPhone.trim()) e.clientPhone = "Phone number is required";
  return e;
}

function validateStep2(f: FormFields) {
  const e: Partial<Record<keyof FormFields, string>> = {};
  if (!f.style) e.style = "Please select a tattoo style";
  if (!f.placement.trim()) e.placement = "Please describe the placement";
  if (!f.size) e.size = "Please select a size";
  if (!f.budgetRange) e.budgetRange = "Please select a budget range";
  if (f.description.trim().length < 20)
    e.description = "Please describe your idea in more detail (min 20 characters)";
  return e;
}

const EMPTY: FormFields = {
  clientName: "", clientEmail: "", clientPhone: "", artistId: "",
  style: "", placement: "", size: "", budgetRange: "", description: "",
  availabilityNote: "",
};

export default function CustomRequestForm({
  studioSlug, studioId, studioName, artists, primaryColor, textOnBrand,
}: Props) {
  const [step, setStep]         = useState<Step>(1);
  const [form, setForm]         = useState<FormFields>({ ...EMPTY });
  const [touched, setTouched]   = useState<Set<string>>(new Set());
  const [photoFiles, setPhotoFiles]   = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const s1Errors = useMemo(() => validateStep1(form), [form]);
  const s2Errors = useMemo(() => validateStep2(form), [form]);

  function set(field: keyof FormFields, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }
  function touch(field: string) {
    setTouched((t) => new Set(t).add(field));
  }
  function err(field: keyof FormFields) {
    if (!touched.has(field)) return null;
    return step === 1 ? (s1Errors[field] ?? null) : (s2Errors[field] ?? null);
  }

  function handleNext() {
    const fields = step === 1
      ? (["clientName", "clientEmail", "clientPhone"] as (keyof FormFields)[])
      : (["style", "placement", "size", "budgetRange", "description"] as (keyof FormFields)[]);
    const newTouched = new Set(Array.from(touched).concat(fields));
    setTouched(newTouched);
    const errors = step === 1 ? validateStep1(form) : validateStep2(form);
    if (Object.keys(errors).length > 0) return;
    setStep((s) => (s + 1) as Step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleBack() {
    setStep((s) => (s - 1) as Step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(e.target.files ?? []);
    const slots = MAX_PHOTOS - photoFiles.length;
    const toAdd = incoming.slice(0, slots).filter((f) => f.size <= MAX_PHOTO_BYTES);
    const newPreviews = toAdd.map((f) => URL.createObjectURL(f));
    setPhotoFiles((p) => [...p, ...toAdd]);
    setPhotoPreviews((p) => [...p, ...newPreviews]);
    e.target.value = "";
  }

  function removePhoto(i: number) {
    URL.revokeObjectURL(photoPreviews[i]);
    setPhotoFiles((p) => p.filter((_, idx) => idx !== i));
    setPhotoPreviews((p) => p.filter((_, idx) => idx !== i));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);

    const fd = new FormData();
    fd.append("studioId",        studioId);
    fd.append("studioSlug",      studioSlug);
    fd.append("studioName",      studioName);
    fd.append("artistId",        form.artistId);
    fd.append("clientName",      form.clientName);
    fd.append("clientEmail",     form.clientEmail);
    fd.append("clientPhone",     form.clientPhone);
    fd.append("style",           form.style);
    fd.append("placement",       form.placement);
    fd.append("size",            form.size);
    fd.append("budgetRange",     form.budgetRange);
    fd.append("description",     form.description);
    fd.append("availabilityNote", form.availabilityNote);
    photoFiles.forEach((f) => fd.append("photos", f));

    const result = await submitCustomRequest(fd);
    setSubmitting(false);

    if (result.error) {
      setSubmitError(result.error);
      return;
    }
    setSubmitted(true);
  }

  const selectedArtistName = artists.find((a) => a.id === form.artistId)?.name ?? null;

  const ic = "w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none transition-colors";
  const lc = "block text-xs font-medium text-white/50 mb-2 uppercase tracking-wide";

  // ── Success screen ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="text-center py-16 px-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: `${primaryColor}1a`, border: `1px solid ${primaryColor}4d` }}
        >
          <span className="text-2xl" style={{ color: primaryColor }}>✓</span>
        </div>
        <h2 className="font-serif text-2xl font-bold mb-3">Request Submitted!</h2>
        <p className="text-zinc-400 text-sm leading-relaxed max-w-sm mx-auto mb-2">
          <strong className="text-white">{selectedArtistName ?? "The studio"}</strong> will review
          your request and respond within 48 hours.
        </p>
        <p className="text-zinc-500 text-xs mb-10">
          Check your email for a confirmation.
        </p>
        <Link
          href={`/book/${studioSlug}`}
          className="text-sm text-zinc-500 hover:text-white transition-colors"
        >
          ← Back to {studioName}
        </Link>
      </div>
    );
  }

  // ── Progress bar ──────────────────────────────────────────────────────────
  const header = (
    <div className="mb-8">
      <div className="flex justify-between mb-2">
        {STEP_LABELS.map((label, i) => (
          <span
            key={label}
            className="text-xs transition-colors"
            style={{ color: step > i ? primaryColor : step === i + 1 ? "#fff" : "#52525b" }}
          >
            {label}
          </span>
        ))}
      </div>
      <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${(step / 3) * 100}%`, backgroundColor: primaryColor }}
        />
      </div>
      <p className="text-xs text-zinc-600 mt-2">Step {step} of 3</p>
    </div>
  );

  const navButtons = (
    <div className="flex items-center gap-3 pt-2">
      {step > 1 && (
        <button
          type="button"
          onClick={handleBack}
          className="px-5 py-3 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          ← Back
        </button>
      )}
      <button
        type="button"
        onClick={step === 3 ? handleSubmit : handleNext}
        disabled={submitting}
        className="flex-1 font-bold text-sm py-3.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: primaryColor, color: textOnBrand }}
      >
        {submitting ? "Submitting…" : step === 3 ? "Submit Request →" : "Next →"}
      </button>
    </div>
  );

  // ── Step 1 — About You ────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div>
        {header}
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cr-client-name" className={lc}>Full Legal Name *</label>
              <input
                id="cr-client-name"
                type="text"
                value={form.clientName}
                onChange={(e) => set("clientName", e.target.value)}
                onBlur={() => touch("clientName")}
                className={ic}
                placeholder="Jane Smith"
              />
              {err("clientName") && <p className="text-red-400 text-xs mt-1">{err("clientName")}</p>}
            </div>
            <div>
              <label htmlFor="cr-client-email" className={lc}>Email *</label>
              <input
                id="cr-client-email"
                type="email"
                value={form.clientEmail}
                onChange={(e) => set("clientEmail", e.target.value)}
                onBlur={() => touch("clientEmail")}
                className={ic}
                placeholder="you@example.com"
              />
              {err("clientEmail") && <p className="text-red-400 text-xs mt-1">{err("clientEmail")}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="cr-client-phone" className={lc}>Phone *</label>
            <input
              id="cr-client-phone"
              type="tel"
              value={form.clientPhone}
              onChange={(e) => set("clientPhone", e.target.value)}
              onBlur={() => touch("clientPhone")}
              className={ic}
              placeholder="+1 (555) 000-0000"
            />
            {err("clientPhone") && <p className="text-red-400 text-xs mt-1">{err("clientPhone")}</p>}
          </div>

          <div>
            <label htmlFor="cr-artist" className={lc}>Preferred Artist</label>
            <select
              id="cr-artist"
              value={form.artistId}
              onChange={(e) => set("artistId", e.target.value)}
              className={ic}
            >
              <option value="">No preference / Studio choice</option>
              {artists.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {navButtons}
        </div>
      </div>
    );
  }

  // ── Step 2 — Your Idea ────────────────────────────────────────────────────
  if (step === 2) {
    return (
      <div>
        {header}
        <div className="space-y-5">
          <div>
            <label htmlFor="cr-style" className={lc}>Tattoo Style *</label>
            <select
              id="cr-style"
              value={form.style}
              onChange={(e) => set("style", e.target.value)}
              onBlur={() => touch("style")}
              className={ic}
            >
              <option value="">Select style</option>
              {STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {err("style") && <p className="text-red-400 text-xs mt-1">{err("style")}</p>}
          </div>

          <div>
            <label htmlFor="cr-placement" className={lc}>Placement *</label>
            <input
              id="cr-placement"
              type="text"
              value={form.placement}
              onChange={(e) => set("placement", e.target.value)}
              onBlur={() => touch("placement")}
              className={ic}
              placeholder="e.g. left forearm, upper back"
            />
            {err("placement") && <p className="text-red-400 text-xs mt-1">{err("placement")}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cr-size" className={lc}>Size *</label>
              <select
                id="cr-size"
                value={form.size}
                onChange={(e) => set("size", e.target.value)}
                onBlur={() => touch("size")}
                className={ic}
              >
                <option value="">Select size</option>
                {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {err("size") && <p className="text-red-400 text-xs mt-1">{err("size")}</p>}
            </div>
            <div>
              <label htmlFor="cr-budget" className={lc}>Budget Range *</label>
              <select
                id="cr-budget"
                value={form.budgetRange}
                onChange={(e) => set("budgetRange", e.target.value)}
                onBlur={() => touch("budgetRange")}
                className={ic}
              >
                <option value="">Select range</option>
                {BUDGETS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              {err("budgetRange") && <p className="text-red-400 text-xs mt-1">{err("budgetRange")}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="cr-description" className={lc}>
              Description *{" "}
              <span className="normal-case tracking-normal text-zinc-600">
                ({form.description.trim().length}/20 min)
              </span>
            </label>
            <textarea
              id="cr-description"
              rows={5}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              onBlur={() => touch("description")}
              className={`${ic} resize-none`}
              placeholder="Describe your tattoo idea in detail. The more detail, the better — subject matter, style references, mood, elements to include or avoid…"
            />
            {err("description") && <p className="text-red-400 text-xs mt-1">{err("description")}</p>}
          </div>

          {navButtons}
        </div>
      </div>
    );
  }

  // ── Step 3 — Final Details ────────────────────────────────────────────────
  return (
    <div>
      {header}
      <div className="space-y-6">

        {/* Reference photos */}
        <div>
          <label htmlFor="cr-photos" className={lc}>
            Reference Photos{" "}
            <span className="normal-case tracking-normal text-zinc-600">
              (optional · up to {MAX_PHOTOS})
            </span>
          </label>

          {photoPreviews.length > 0 ? (
            <div className="flex flex-wrap gap-3 mb-3">
              {photoPreviews.map((src, i) => (
                <div key={i} className="relative w-20 h-20 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`Ref ${i + 1}`}
                    className="w-full h-full object-cover rounded-lg border border-zinc-700"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-zinc-900 border border-zinc-600 rounded-full flex items-center justify-center text-zinc-400 hover:text-white text-[10px]"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {photoFiles.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-20 h-20 shrink-0 border border-dashed border-zinc-700 rounded-lg flex items-center justify-center text-zinc-600 hover:text-zinc-400 hover:border-zinc-500 transition-colors text-xl"
                >
                  +
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 border border-dashed border-zinc-800 rounded-xl py-8 hover:border-zinc-600 transition-colors mb-2"
            >
              <span className="text-2xl text-zinc-700">↑</span>
              <span className="text-sm text-zinc-400">Tap to upload photos</span>
              <span className="text-xs text-zinc-700">JPG, PNG, WebP · max 5 MB each</span>
            </button>
          )}

          <input
            id="cr-photos"
            ref={fileRef}
            type="file"
            accept={ACCEPTED}
            multiple
            onChange={handleFileChange}
            className="sr-only"
          />
        </div>

        {/* Availability */}
        <div>
          <label htmlFor="cr-availability" className={lc}>Availability</label>
          <input
            id="cr-availability"
            type="text"
            value={form.availabilityNote}
            onChange={(e) => set("availabilityNote", e.target.value)}
            className={ic}
            placeholder="e.g. weekends, weekday evenings, anytime in March"
          />
        </div>

        {/* Review summary */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
          <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-medium">
            Review Your Request
          </h3>

          <Section title="Your Details">
            <Row label="Name"   value={form.clientName} />
            <Row label="Email"  value={form.clientEmail} />
            <Row label="Phone"  value={form.clientPhone} />
            <Row label="Artist" value={selectedArtistName ?? "No preference"} />
          </Section>

          <Section title="Tattoo Details">
            <Row label="Style"       value={form.style} />
            <Row label="Placement"   value={form.placement} />
            <Row label="Size"        value={form.size} />
            <Row label="Budget"      value={form.budgetRange} />
            {form.availabilityNote && <Row label="Available" value={form.availabilityNote} />}
          </Section>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Description</p>
            <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap line-clamp-4">
              {form.description}
            </p>
          </div>

          {photoPreviews.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2">
                Reference Photos
              </p>
              <div className="flex gap-2 flex-wrap">
                {photoPreviews.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={src} alt={`Ref ${i + 1}`}
                    className="w-14 h-14 object-cover rounded-md border border-zinc-700"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-gold/5 border border-gold/15 rounded-xl px-4 py-3 text-xs text-white/40 leading-relaxed">
          Submitting this form is <span className="text-white/60">not a booking</span>.
          The artist will review your request and send a deposit amount to confirm.
          No charge until you accept.
        </div>

        {submitError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
            {submitError}
          </div>
        )}

        {navButtons}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2">{title}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-zinc-600 text-xs">{label}: </span>
      <span className="text-zinc-300 text-xs">{value}</span>
    </div>
  );
}
