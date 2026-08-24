"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markFlashAsBooked } from "./actions";

interface Props {
  studioSlug: string;
  artistId: string;
  flashDesignId: string;
  flashTitle: string;
  flashCategory: string | null;
  isRepeatable: boolean;
}

const TIMES = [
  "10:00", "11:00", "12:00", "13:00",
  "14:00", "15:00", "16:00", "17:00",
];

function fmt12h(t: string) {
  const [h] = t.split(":");
  const hour = parseInt(h);
  return hour < 12 ? `${hour}:00 AM` : hour === 12 ? "12:00 PM" : `${hour - 12}:00 PM`;
}

export default function FlashBookingForm({
  studioSlug,
  artistId,
  flashDesignId,
  flashTitle,
  flashCategory,
  isRepeatable,
}: Props) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email,    setEmail]    = useState("");
  const [phone,    setPhone]    = useState("");
  const [date,     setDate]     = useState("");
  const [time,     setTime]     = useState("");
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistId,
          clientName:  fullName,
          clientEmail: email,
          clientPhone: phone,
          date,
          time,
          style:       flashCategory ?? "Other",
          description: `Flash: ${flashTitle}`,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      // Mark non-repeatable flash as booked (best-effort, non-blocking)
      if (!isRepeatable) {
        await markFlashAsBooked(flashDesignId, studioSlug);
      }

      router.push(
        `/book/${studioSlug}/${artistId}/book/deposit?booking_id=${data.bookingId}`
      );
    } catch {
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  };

  const inputClass =
    "w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-gold transition-colors";
  const labelClass =
    "block text-xs font-medium text-white/50 mb-2 uppercase tracking-wide";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="flash-full-name" className={labelClass}>Full legal name</label>
          <input
            id="flash-full-name"
            required
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputClass}
            placeholder="Jane Smith"
          />
        </div>
        <div>
          <label htmlFor="flash-email" className={labelClass}>Email</label>
          <input
            id="flash-email"
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div>
        <label htmlFor="flash-phone" className={labelClass}>Phone (for SMS reminders)</label>
        <input
          id="flash-phone"
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
          <label htmlFor="flash-date" className={labelClass}>Preferred date</label>
          <input
            id="flash-date"
            required
            type="date"
            min={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`${inputClass} [color-scheme:dark]`}
          />
        </div>
        <div>
          <label htmlFor="flash-time" className={labelClass}>Preferred time</label>
          <select
            id="flash-time"
            required
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={inputClass}
          >
            <option value="">Select time</option>
            {TIMES.map((t) => (
              <option key={t} value={t}>{fmt12h(t)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-gold/5 border border-gold/15 rounded-xl px-4 py-3 text-xs text-white/40 leading-relaxed">
        A deposit is required to confirm your booking and is applied toward your session.
        It is <span className="text-white/60">non-refundable</span> for no-shows or
        cancellations within 48 hours.
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
