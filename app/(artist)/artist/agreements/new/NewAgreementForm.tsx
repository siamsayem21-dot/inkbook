"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSessionAgreement } from "../actions";

const inputClass =
  "w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-colors";
const labelClass = "text-xs text-zinc-400 block mb-1.5";

export default function NewAgreementForm({ bookingOptions }: { bookingOptions: { id: string; label: string }[] }) {
  const router = useRouter();
  const [bookingId, setBookingId] = useState(bookingOptions[0]?.id ?? "");
  const [designDescription, setDesignDescription] = useState("");
  const [placement, setPlacement] = useState("");
  const [price, setPrice] = useState("");
  const [sizeInches, setSizeInches] = useState("");
  const [signature, setSignature] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await createSessionAgreement({
      bookingId,
      designDescription,
      placement,
      agreedPriceDollars: parseFloat(price),
      sizeInches,
      clientSignature: signature,
    });

    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push(`/artist/agreements/${result.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 space-y-4">
      {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}

      <div>
        <label className={labelClass}>Session *</label>
        <select required value={bookingId} onChange={(e) => setBookingId(e.target.value)} className={inputClass}>
          {bookingOptions.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Design Description *</label>
        <textarea
          required rows={3} value={designDescription} onChange={(e) => setDesignDescription(e.target.value)}
          placeholder="Exact scope agreed for this session — what's being tattooed, style, details"
          className={`${inputClass} resize-none`}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Placement *</label>
          <input required type="text" value={placement} onChange={(e) => setPlacement(e.target.value)} placeholder="e.g. Left forearm" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Size (optional)</label>
          <input type="text" value={sizeInches} onChange={(e) => setSizeInches(e.target.value)} placeholder={'e.g. 4"x6"'} className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Agreed Price (USD) *</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
          <input required type="number" min="0" step="1" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="300" className={`${inputClass} pl-7`} />
        </div>
      </div>

      <div className="pt-2 border-t border-zinc-100">
        <label className={labelClass}>Client Signature * <span className="text-zinc-400">(client types their full legal name to confirm)</span></label>
        <input
          required type="text" value={signature} onChange={(e) => setSignature(e.target.value)}
          placeholder="Client's full legal name"
          className={inputClass}
        />
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="submit" disabled={loading}
          className="bg-violet-600 hover:bg-violet-700 text-white text-sm px-6 py-2.5 rounded-xl font-semibold transition-colors disabled:opacity-50"
        >
          {loading ? "Saving…" : "Sign & Save Agreement"}
        </button>
      </div>
      <p className="text-[11px] text-zinc-400">This creates a permanent, immutable record once submitted.</p>
    </form>
  );
}
