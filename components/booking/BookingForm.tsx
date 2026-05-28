"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  studioSlug: string;
  artistId: string;
}

const STYLES = ["Traditional", "Neo-traditional", "Blackwork", "Realism", "Japanese", "Fine Line", "Geometric", "Minimalist", "Other"];

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
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistId, clientName: fullName, clientEmail: email, clientPhone: phone, date, time, style, description }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      router.push(`/book/${studioSlug}/${artistId}/book/deposit?booking_id=${data.bookingId}`);
    } catch {
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  };

  const inputClass = "w-full border border-zinc-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-500";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-zinc-500 block mb-1.5">Full legal name</label>
          <input required type="text" value={fullName} onChange={e => setFullName(e.target.value)} className={inputClass} placeholder="Jane Smith" />
        </div>
        <div>
          <label className="text-sm text-zinc-500 block mb-1.5">Email</label>
          <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} placeholder="you@example.com" />
        </div>
      </div>

      <div>
        <label className="text-sm text-zinc-500 block mb-1.5">Phone (for SMS reminders)</label>
        <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} placeholder="+1 (555) 000-0000" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-zinc-500 block mb-1.5">Preferred date</label>
          <input required type="date" min={today} value={date} onChange={e => setDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="text-sm text-zinc-500 block mb-1.5">Preferred time</label>
          <input required type="time" value={time} onChange={e => setTime(e.target.value)} className={inputClass} />
        </div>
      </div>

      <div>
        <label className="text-sm text-zinc-500 block mb-1.5">Tattoo style</label>
        <select required value={style} onChange={e => setStyle(e.target.value)} className={inputClass}>
          <option value="">Select style</option>
          {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div>
        <label className="text-sm text-zinc-500 block mb-1.5">Description &amp; placement</label>
        <textarea
          required
          rows={3}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="e.g. Small rose on inner wrist, approx 2 inches"
          className={`${inputClass} resize-none`}
        />
      </div>

      <p className="text-xs text-zinc-400 bg-zinc-50 border border-zinc-200 rounded-lg p-3">
        A deposit is required to confirm your booking. Your card will be charged on the next step.
        Deposits are non-refundable for no-shows or cancellations within 48 hours.
      </p>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-zinc-900 text-white font-semibold py-3 rounded-full hover:bg-zinc-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Creating booking…" : "Continue to deposit →"}
      </button>
    </form>
  );
}
