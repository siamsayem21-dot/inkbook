"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  bookingId: string;
  studioSlug: string;
  artistId: string;
}

export default function ConsentForm({ bookingId, studioSlug, artistId }: Props) {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [isMinor, setIsMinor] = useState(false);
  const [guardianName, setGuardianName] = useState("");
  const [guardianSignature, setGuardianSignature] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState("");
  const [idPhoto, setIdPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDobChange = (value: string) => {
    setDob(value);
    if (value) {
      const birthYear = new Date(value).getFullYear();
      const age = new Date().getFullYear() - birthYear;
      setIsMinor(age < 18);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!idPhoto) {
      setError("Please upload a government-issued ID photo.");
      return;
    }
    if (!agreed) {
      setError("You must agree to the consent form.");
      return;
    }

    setLoading(true);
    setError(null);

    const data = new FormData();
    data.append("bookingId", bookingId);
    data.append("fullName", fullName);
    data.append("dob", dob);
    data.append("signature", signature);
    data.append("isMinor", String(isMinor));
    data.append("idPhoto", idPhoto);
    if (isMinor) {
      data.append("guardianName", guardianName);
      data.append("guardianSignature", guardianSignature);
    }

    try {
      const res = await fetch("/api/consent-forms", {
        method: "POST",
        body: data,
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      router.push(
        `/book/${studioSlug}/${artistId}/book/confirmation?booking_id=${bookingId}`
      );
    } catch {
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  };

  const inputClass =
    "w-full border border-zinc-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:border-zinc-500";
  const labelClass = "text-sm text-gray-700 block mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className={labelClass}>Full legal name</label>
        <input
          required
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="As it appears on your ID"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Date of birth</label>
        <input
          required
          type="date"
          value={dob}
          onChange={(e) => handleDobChange(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Government ID photo</label>
        <input
          required
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          onChange={(e) => setIdPhoto(e.target.files?.[0] ?? null)}
          className={inputClass}
        />
        <p className="text-xs text-gray-500 mt-1">
          Driver&apos;s license or passport. Stored securely, never shared.
        </p>
      </div>

      {isMinor && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-yellow-800">
            Parental / guardian consent required
          </p>
          <div>
            <label className="text-sm text-gray-700 block mb-1.5">Guardian full name</label>
            <input
              required
              type="text"
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-sm text-gray-700 block mb-1.5">
              Guardian signature (type full name)
            </label>
            <input
              required
              type="text"
              value={guardianSignature}
              onChange={(e) => setGuardianSignature(e.target.value)}
              className={`${inputClass} font-[cursive]`}
            />
          </div>
        </div>
      )}

      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-xs text-gray-800 h-36 overflow-y-auto leading-relaxed">
        <p className="font-semibold text-gray-800 mb-2">Tattoo Consent &amp; Release Form</p>
        <p>
          I understand that tattooing involves the introduction of pigments under the skin
          using needles. I acknowledge the inherent risks including but not limited to
          infection, allergic reactions, and scarring. I confirm that I am not under the
          influence of alcohol or drugs at the time of my appointment. I have disclosed any
          medical conditions, medications, or allergies that may affect the procedure. I
          release the artist and studio from any liability arising from this procedure when
          performed in compliance with applicable health regulations. I understand the deposit
          paid is non-refundable in the event of a no-show or cancellation within 48 hours of
          the appointment.
        </p>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          required
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 shrink-0"
        />
        <span className="text-sm text-gray-700">
          I have read, understood, and agree to the consent form above. I confirm all
          information provided is accurate and matches my government-issued ID.
        </span>
      </label>

      <div>
        <label className={labelClass}>
          Signature (type your full legal name)
        </label>
        <input
          required
          type="text"
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          placeholder={fullName || "Your full name"}
          className={`${inputClass} font-[cursive]`}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !agreed}
        className="w-full bg-zinc-900 text-white font-semibold py-3 rounded-full hover:bg-zinc-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Submitting…" : "Sign & confirm booking →"}
      </button>
    </form>
  );
}
