"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

const MAX_PHOTOS = 3;
const ACCEPTED = "image/jpeg,image/jpg,image/png,image/webp,image/gif";

export default function CustomRequestForm({ studioSlug, studioId, artists }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Photo state — local File objects + object URL previews
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

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
    agreed: false,
  });

  function set(field: keyof typeof form, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(e.target.files ?? []);
    // Only take as many as slots remain
    const slots = MAX_PHOTOS - photoFiles.length;
    const toAdd = incoming.slice(0, slots);

    const newPreviews = toAdd.map((f) => URL.createObjectURL(f));
    setPhotoFiles((prev) => [...prev, ...toAdd]);
    setPreviews((prev) => [...prev, ...newPreviews]);

    // Reset so the same file can be re-selected after removal
    e.target.value = "";
  }

  function removePhoto(i: number) {
    URL.revokeObjectURL(previews[i]);
    setPhotoFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function uploadPhotos(): Promise<string[]> {
    if (photoFiles.length === 0) return [];

    const supabase = createClient();
    const urls: string[] = [];

    for (const file of photoFiles) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${studioId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error: upErr } = await supabase.storage
        .from("reference-photos")
        .upload(path, file, { upsert: false });
      if (!upErr && data) {
        const { data: { publicUrl } } = supabase.storage
          .from("reference-photos")
          .getPublicUrl(data.path);
        urls.push(publicUrl);
      }
    }

    return urls;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.agreed) {
      setError("Please confirm you understand how the quote process works.");
      return;
    }

    setLoading(true);
    try {
      let reference_photos: string[] = [];

      if (photoFiles.length > 0) {
        setLoadingMsg("Uploading photos…");
        reference_photos = await uploadPhotos();
      }

      setLoadingMsg("Submitting request…");
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
          reference_photos,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submission failed");
      router.push(`/book/${studioSlug}/request/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
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

        {/* Reference Photos — file upload */}
        <div>
          <label className={labelCls}>
            Reference Photos
            <span className="normal-case tracking-normal text-zinc-600 ml-1.5">(optional · up to {MAX_PHOTOS})</span>
          </label>

          {/* Thumbnails */}
          {previews.length > 0 && (
            <div className="flex gap-3 mb-3 flex-wrap">
              {previews.map((src, i) => (
                <div key={i} className="relative w-20 h-20 shrink-0 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`Reference ${i + 1}`}
                    className="w-full h-full object-cover rounded-lg border border-zinc-700"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-zinc-900 border border-zinc-600 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-300 transition-colors text-[10px] leading-none"
                    aria-label="Remove photo"
                  >
                    ✕
                  </button>
                </div>
              ))}

              {/* Add-more slot if under limit */}
              {photoFiles.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 shrink-0 border border-zinc-700 border-dashed rounded-lg flex items-center justify-center text-zinc-600 hover:text-zinc-400 hover:border-zinc-500 transition-colors text-xl"
                  aria-label="Add another photo"
                >
                  +
                </button>
              )}
            </div>
          )}

          {/* Drop zone — only shown when no photos yet */}
          {photoFiles.length === 0 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 border border-zinc-700 border-dashed rounded-lg py-7 px-4 text-center hover:border-zinc-500 hover:bg-zinc-900/60 transition-colors cursor-pointer"
            >
              <span className="text-2xl text-zinc-600">↑</span>
              <span className="text-sm text-zinc-400">Tap to upload or use camera</span>
              <span className="text-xs text-zinc-600">JPG, PNG, WebP, GIF</span>
            </button>
          )}

          {/* Hidden real input — no capture attr so iOS shows camera+gallery sheet */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED}
            multiple
            className="sr-only"
            onChange={handleFileChange}
          />

          <p className="text-zinc-600 text-xs mt-1.5">
            Works with your phone camera or photo library.
          </p>
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
        {loading ? (loadingMsg || "Submitting…") : "Submit Custom Request"}
      </button>
    </form>
  );
}
