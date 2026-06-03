"use client";

import { useState } from "react";

interface Artist {
  id: string;
  name: string;
}

interface Props {
  studioSlug: string;
  studioId: string;
  artists: Artist[];
}

const SIZE_OPTIONS = [
  "Tiny (under 2\")",
  "Small (2–4\")",
  "Medium (4–6\")",
  "Large (6–10\")",
  "X-Large (10\"+)",
  "Half sleeve",
  "Full sleeve",
  "Back piece",
];

const BUDGET_OPTIONS = [
  "Under $300",
  "$300 – $600",
  "$600 – $1,000",
  "$1,000 – $2,000",
  "$2,000+",
  "Let the artist quote",
];

export default function CustomRequestForm({ studioSlug, studioId, artists }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    client_name: "",
    client_email: "",
    client_phone: "",
    artist_id: "",
    design_description: "",
    placement: "",
    size: "",
    budget_range: "",
    preferred_dates: "",
    ref1: "",
    ref2: "",
    ref3: "",
    agreed: false,
  });

  function set(field: keyof typeof form, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.agreed) {
      setError("Please confirm you understand how the quote process works.");
      return;
    }

    const photos = [form.ref1, form.ref2, form.ref3].filter(Boolean);

    setLoading(true);
    try {
      const res = await fetch("/api/custom-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studio_id: studioId,
          artist_id: form.artist_id || null,
          client_name: form.client_name,
          client_email: form.client_email,
          client_phone: form.client_phone,
          design_description: form.design_description,
          placement: form.placement,
          size: form.size,
          budget_range: form.budget_range,
          preferred_dates: form.preferred_dates,
          reference_photos: photos,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submission failed");
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="bg-gold/[0.07] border border-gold/25 rounded-xl px-6 py-10 text-center">
        <div className="w-12 h-12 border border-gold/40 flex items-center justify-center mx-auto mb-5">
          <span className="text-gold text-xl">✓</span>
        </div>
        <h2 className="font-cinzel text-xl font-bold mb-2">Request Submitted</h2>
        <p className="text-zinc-400 text-sm max-w-sm mx-auto">
          Your custom tattoo request has been sent. The artist will review it and email you a quote within 2–3 business days.
        </p>
        <p className="text-zinc-600 text-xs mt-4">Check your inbox — including spam.</p>
      </div>
    );
  }

  const inputCls =
    "w-full bg-zinc-900 border border-zinc-800 text-white text-sm rounded-lg px-4 py-3 placeholder-zinc-600 focus:outline-none focus:border-gold/50 transition-colors";
  const labelCls = "block text-xs uppercase tracking-widest text-zinc-500 mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Contact */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 space-y-4">
        <h2 className="text-xs uppercase tracking-widest text-zinc-500 font-medium">Your Contact Info</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Full Name *</label>
            <input
              required
              type="text"
              className={inputCls}
              placeholder="Jane Smith"
              value={form.client_name}
              onChange={(e) => set("client_name", e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Email *</label>
            <input
              required
              type="email"
              className={inputCls}
              placeholder="jane@email.com"
              value={form.client_email}
              onChange={(e) => set("client_email", e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Phone *</label>
            <input
              required
              type="tel"
              className={inputCls}
              placeholder="+1 (555) 000-0000"
              value={form.client_phone}
              onChange={(e) => set("client_phone", e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Preferred Artist</label>
            <select
              className={inputCls}
              value={form.artist_id}
              onChange={(e) => set("artist_id", e.target.value)}
            >
              <option value="">No preference / Studio choice</option>
              {artists.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Design Details */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 space-y-4">
        <h2 className="text-xs uppercase tracking-widest text-zinc-500 font-medium">Design Details</h2>

        <div>
          <label className={labelCls}>Design Description *</label>
          <textarea
            required
            rows={4}
            className={`${inputCls} resize-none`}
            placeholder="Describe your tattoo idea in detail — subject matter, style (realism, traditional, neo-trad, blackwork, etc.), mood, and any specific elements you want included..."
            value={form.design_description}
            onChange={(e) => set("design_description", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Placement *</label>
            <input
              required
              type="text"
              className={inputCls}
              placeholder="e.g. Left forearm, inner wrist"
              value={form.placement}
              onChange={(e) => set("placement", e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Approximate Size *</label>
            <select
              required
              className={inputCls}
              value={form.size}
              onChange={(e) => set("size", e.target.value)}
            >
              <option value="">Select size</option>
              {SIZE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Reference Photos (optional — paste image URLs)</label>
          <div className="space-y-2">
            {[form.ref1, form.ref2, form.ref3].map((val, i) => (
              <input
                key={i}
                type="url"
                className={inputCls}
                placeholder={`Image URL ${i + 1} (Imgur, Google Drive, etc.)`}
                value={val}
                onChange={(e) => set(`ref${i + 1}` as "ref1" | "ref2" | "ref3", e.target.value)}
              />
            ))}
          </div>
          <p className="text-zinc-600 text-xs mt-1.5">Paste direct image links. You can also email references after submitting.</p>
        </div>
      </div>

      {/* Scheduling & Budget */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 space-y-4">
        <h2 className="text-xs uppercase tracking-widest text-zinc-500 font-medium">Scheduling & Budget</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Budget Range *</label>
            <select
              required
              className={inputCls}
              value={form.budget_range}
              onChange={(e) => set("budget_range", e.target.value)}
            >
              <option value="">Select range</option>
              {BUDGET_OPTIONS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Preferred Dates / Availability *</label>
            <input
              required
              type="text"
              className={inputCls}
              placeholder="e.g. Weekends in Feb, prefer mornings"
              value={form.preferred_dates}
              onChange={(e) => set("preferred_dates", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Agreement */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          className="mt-0.5 accent-gold shrink-0"
          checked={form.agreed}
          onChange={(e) => set("agreed", e.target.checked)}
        />
        <span className="text-xs text-zinc-400 leading-relaxed">
          I understand that submitting this form is <strong className="text-white">not a booking</strong>.
          The artist will review my request and send a custom quote. A deposit is required to confirm the appointment.
        </span>
      </label>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gold text-black font-bold text-sm py-3.5 rounded-lg hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Submitting…" : "Submit Custom Request"}
      </button>
    </form>
  );
}
