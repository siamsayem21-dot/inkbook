"use client";

import { useState } from "react";

interface Props {
  studioSlug: string;
  studioName: string;
}

type HealthKey = "bloodThinner" | "diabetic" | "skinCondition" | "pregnant";

const HEALTH_QUESTIONS: { key: HealthKey; label: string; detail: string }[] = [
  {
    key: "bloodThinner",
    label: "Blood thinners or aspirin",
    detail: "Warfarin, heparin, clopidogrel, or daily aspirin",
  },
  {
    key: "diabetic",
    label: "Diabetes",
    detail: "Type 1 or Type 2",
  },
  {
    key: "skinCondition",
    label: "Skin condition",
    detail: "Eczema, psoriasis, keloids, or chronic skin issues",
  },
  {
    key: "pregnant",
    label: "Pregnant or breastfeeding",
    detail: "",
  },
];

function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

const maxDob = new Date();
maxDob.setFullYear(maxDob.getFullYear() - 1);
const MAX_DOB = maxDob.toISOString().split("T")[0];

const inputClass =
  "w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-gold transition-colors";
const labelClass =
  "block text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-2";

export default function StandaloneConsentForm({ studioSlug, studioName }: Props) {
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [ageError, setAgeError] = useState<string | null>(null);
  const [health, setHealth] = useState<Record<HealthKey, boolean>>({
    bloodThinner: false,
    diabetic: false,
    skinCondition: false,
    pregnant: false,
  });
  const [placement, setPlacement] = useState("");
  const [artistName, setArtistName] = useState("");
  const [designDescription, setDesignDescription] = useState("");
  const [agreedToAftercare, setAgreedToAftercare] = useState(false);
  const [signature, setSignature] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleDobChange(value: string) {
    setDob(value);
    setAgeError(null);
    if (value) {
      const age = calculateAge(value);
      if (age < 18) {
        setAgeError(
          `You must be 18 or older to complete this form. You are ${age} year${age !== 1 ? "s" : ""} old. Please have a parent or guardian contact the studio directly.`
        );
      }
    }
  }

  function toggleHealth(key: HealthKey) {
    setHealth((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const isMinor = dob ? calculateAge(dob) < 18 : false;
  const anyHealthFlag = Object.values(health).some(Boolean);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (isMinor) {
      setError("You must be 18 or older to complete this form.");
      return;
    }

    if (signature.trim().toLowerCase() !== fullName.trim().toLowerCase()) {
      setError(
        "Your signature must match your full legal name exactly. Please retype it carefully."
      );
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/consent-forms/standalone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studioSlug,
          fullName: fullName.trim(),
          dateOfBirth: dob,
          isMinor,
          ...health,
          placement: placement.trim(),
          artistName: artistName.trim(),
          designDescription: designDescription.trim(),
          agreedToAftercare,
          signature: signature.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center mb-6">
          <span className="text-gold text-2xl">✓</span>
        </div>
        <h2 className="text-2xl font-bold mb-2">Form submitted successfully</h2>
        <p className="text-white/50 text-sm max-w-xs">
          Your consent form has been saved. {studioName} has everything they need for your appointment.
        </p>
        <div className="mt-8 bg-zinc-900 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white/40 max-w-xs">
          <p className="font-medium text-white mb-1">{fullName}</p>
          <p>Artist: {artistName}</p>
          <p>Placement: {placement}</p>
          <p className="mt-1 text-xs text-white/25">
            Signed {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* Section 1 — Identity */}
      <section>
        <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-gold text-black text-xs font-bold flex items-center justify-center">1</span>
          Your information
        </h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="scf-full-name" className={labelClass}>Full legal name</label>
            <input
              id="scf-full-name"
              required
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="As it appears on your ID"
              className={inputClass}
              autoComplete="name"
            />
          </div>
          <div>
            <label htmlFor="scf-dob" className={labelClass}>Date of birth</label>
            <input
              id="scf-dob"
              required
              type="date"
              value={dob}
              max={MAX_DOB}
              onChange={(e) => handleDobChange(e.target.value)}
              className={`${inputClass} [color-scheme:dark]`}
            />
            {ageError && (
              <div className="mt-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg px-4 py-3 leading-relaxed">
                {ageError}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Section 2 — Health */}
      <section>
        <h2 className="text-base font-semibold mb-1 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-gold text-black text-xs font-bold flex items-center justify-center">2</span>
          Health disclosure
        </h2>
        <p className="text-white/40 text-xs mb-4 ml-8">
          Tap any that apply to you. This helps your artist take proper precautions.
        </p>
        <div className="space-y-2">
          {HEALTH_QUESTIONS.map((q) => {
            const active = health[q.key];
            return (
              <button
                key={q.key}
                type="button"
                onClick={() => toggleHealth(q.key)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
                  active
                    ? "bg-yellow-500/10 border-yellow-500/30"
                    : "bg-zinc-900 border-white/10 hover:border-white/20"
                }`}
              >
                <div className="flex-1 pr-4">
                  <p className={`text-sm font-medium ${active ? "text-yellow-300" : "text-white"}`}>
                    {q.label}
                  </p>
                  {q.detail && (
                    <p className="text-xs text-white/30 mt-0.5">{q.detail}</p>
                  )}
                </div>
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    active
                      ? "bg-yellow-500 border-yellow-500"
                      : "border-white/20"
                  }`}
                >
                  {active && <span className="text-black text-xs font-bold">✓</span>}
                </div>
              </button>
            );
          })}
        </div>
        {anyHealthFlag && (
          <p className="text-xs text-yellow-400/70 mt-3 bg-yellow-500/5 border border-yellow-500/15 rounded-lg px-4 py-2.5">
            Please discuss these conditions with your artist before the session begins.
          </p>
        )}
      </section>

      {/* Section 3 — Appointment details */}
      <section>
        <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-gold text-black text-xs font-bold flex items-center justify-center">3</span>
          Appointment details
        </h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="scf-placement" className={labelClass}>Tattoo placement</label>
            <input
              id="scf-placement"
              required
              type="text"
              value={placement}
              onChange={(e) => setPlacement(e.target.value)}
              placeholder="e.g. Inner left forearm"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="scf-artist-name" className={labelClass}>Artist name</label>
            <input
              id="scf-artist-name"
              required
              type="text"
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              placeholder="Your artist's name"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="scf-design-description" className={labelClass}>Design description</label>
            <textarea
              id="scf-design-description"
              required
              rows={3}
              value={designDescription}
              onChange={(e) => setDesignDescription(e.target.value)}
              placeholder="e.g. Traditional rose with banner, approx 3 inches"
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>
      </section>

      {/* Section 4 — Consent & signature */}
      <section>
        <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-gold text-black text-xs font-bold flex items-center justify-center">4</span>
          Consent &amp; signature
        </h2>

        {/* Legal text */}
        <div className="bg-zinc-900 border border-white/10 rounded-xl p-4 text-xs text-white/40 leading-relaxed mb-5 max-h-36 overflow-y-auto">
          <p className="font-semibold text-white/60 mb-2">Tattoo Release &amp; Consent</p>
          <p>
            I confirm I am 18 years of age or older. I understand tattooing involves
            introducing pigments under the skin using needles and acknowledge the inherent
            risks including infection, allergic reactions, and scarring. I confirm I am not
            under the influence of alcohol or drugs. I have disclosed all medical conditions,
            medications, and allergies that may affect the procedure. I release the artist
            and studio from any liability arising from this procedure when performed in
            compliance with applicable health regulations. I understand the deposit paid is
            non-refundable for no-shows or cancellations within 48 hours.
          </p>
        </div>

        {/* Aftercare checkbox */}
        <label className="flex items-start gap-3 mb-5 cursor-pointer group">
          <div
            className={`mt-0.5 w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-all ${
              agreedToAftercare
                ? "bg-gold border-gold"
                : "border-white/20 group-hover:border-white/40"
            }`}
          >
            {agreedToAftercare && (
              <span className="text-black text-xs font-bold">✓</span>
            )}
            <input
              type="checkbox"
              className="sr-only"
              checked={agreedToAftercare}
              onChange={(e) => setAgreedToAftercare(e.target.checked)}
            />
          </div>
          <span className="text-sm text-white/60 leading-relaxed">
            I agree to follow all aftercare instructions provided by my artist. I understand
            that proper aftercare is my responsibility and affects healing outcomes.
          </span>
        </label>

        {/* Signature */}
        <div>
          <label htmlFor="scf-signature" className={labelClass}>
            Digital signature — type your full legal name to sign
          </label>
          <input
            id="scf-signature"
            required
            type="text"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder={fullName || "Your full legal name"}
            className={`${inputClass} font-[cursive] text-base tracking-wide`}
          />
          {signature && fullName && signature.trim().toLowerCase() !== fullName.trim().toLowerCase() && (
            <p className="text-xs text-red-400 mt-1.5">
              Must match your full legal name: &ldquo;{fullName}&rdquo;
            </p>
          )}
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || isMinor || !agreedToAftercare}
        className="w-full bg-gold text-black font-bold py-4 rounded-full hover:bg-gold-light disabled:opacity-40 transition-colors text-sm"
      >
        {loading ? "Submitting…" : "Sign & submit consent form →"}
      </button>

      <p className="text-center text-white/20 text-xs pb-4">
        This form is legally binding. Your signature confirms you have read and agreed to all terms above.
      </p>
    </form>
  );
}
