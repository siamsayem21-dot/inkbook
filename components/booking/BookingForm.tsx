"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  studioSlug: string;
  artistId: string;
}

const STYLES = [
  "Traditional",
  "Neo-traditional",
  "Blackwork",
  "Realism",
  "Japanese",
  "Fine Line",
  "Geometric",
  "Minimalist",
  "Other",
];

const TIMES = [
  "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
];

export default function BookingForm({ studioSlug, artistId }: Props) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [style, setStyle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [waitlistEligible, setWaitlistEligible] = useState(false);
  const [waitlistJoining, setWaitlistJoining] = useState(false);
  const [waitlistJoined, setWaitlistJoined] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setWaitlistEligible(false);
    setWaitlistJoined(false);

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Enter a valid email address");
      return;
    }
    setEmailError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistId,
          clientName: fullName,
          clientEmail: email,
          clientPhone: phone,
          date,
          time,
          style,
          description,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setWaitlistEligible(Boolean(data.waitlistEligible));
        setLoading(false);
        return;
      }

      router.push(`/book/${studioSlug}/${artistId}/book/deposit?booking_id=${data.bookingId}`);
    } catch {
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  };

  const handleJoinWaitlist = async () => {
    setWaitlistJoining(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistId,
          clientName: fullName,
          clientEmail: email,
          clientPhone: phone,
          style,
          notes: description,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to join waitlist. Please try again.");
        setWaitlistJoining(false);
        return;
      }
      setWaitlistJoined(true);
      setWaitlistEligible(false);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setWaitlistJoining(false);
    }
  };

  const inputClass =
    "w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-gold transition-colors";
  const labelClass = "block text-xs font-medium text-white/50 mb-2 uppercase tracking-wide";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 space-y-3">
          <p>{error}</p>
          {waitlistEligible && !waitlistJoined && (
            <button
              type="button"
              onClick={handleJoinWaitlist}
              disabled={waitlistJoining}
              className="bg-gold text-black font-semibold text-xs px-4 py-2 rounded-full hover:bg-gold-light disabled:opacity-50 transition-colors"
            >
              {waitlistJoining ? "Joining…" : "Join Waitlist"}
            </button>
          )}
        </div>
      )}

      {waitlistJoined && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-xl px-4 py-3">
          You&apos;re on the waitlist — we&apos;ll text and email you if a slot opens up this month.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Full legal name</label>
          <input
            required
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputClass}
            placeholder="Jane Smith"
          />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError(null);
            }}
            className={inputClass}
            placeholder="you@example.com"
          />
          {emailError && <p className="text-red-400 text-xs mt-1.5">{emailError}</p>}
        </div>
      </div>

      <div>
        <label className={labelClass}>Phone (for SMS reminders)</label>
        <input
          required
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={inputClass}
          placeholder="+1 (555) 000-0000"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Preferred date</label>
          <input
            required
            type="date"
            min={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`${inputClass} [color-scheme:dark]`}
          />
        </div>
        <div>
          <label className={labelClass}>Preferred time</label>
          <select
            required
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={inputClass}
          >
            <option value="">Select time</option>
            {TIMES.map((t) => {
              const [h] = t.split(":");
              const hour = parseInt(h);
              const label = hour < 12 ? `${hour}:00 AM` : hour === 12 ? "12:00 PM" : `${hour - 12}:00 PM`;
              return (
                <option key={t} value={t}>{label}</option>
              );
            })}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Tattoo style</label>
        <select
          required
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          className={inputClass}
        >
          <option value="">Select style</option>
          {STYLES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Description &amp; placement</label>
        <textarea
          required
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Small rose on inner wrist, approx 2 inches"
          className={`${inputClass} resize-none`}
        />
      </div>

      <div className="bg-gold/5 border border-gold/15 rounded-xl px-4 py-3 text-xs text-white/40 leading-relaxed">
        A deposit is required to confirm your booking and is applied toward your session.
        It is <span className="text-white/60">non-refundable</span> for no-shows or cancellations within 48 hours.
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gold text-black font-bold py-3.5 rounded-full hover:bg-gold-light disabled:opacity-50 transition-colors text-sm"
      >
        {loading ? "Creating booking…" : "Continue to deposit →"}
      </button>
    </form>
  );
}
