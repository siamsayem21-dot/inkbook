"use client";

import { useState, useTransition } from "react";
import { toggleFlashAvailability, deleteFlashDesignOwner } from "./actions";

export type FlashDesign = {
  id: string;
  artist_id: string;
  title: string;
  image_url: string;
  price: number;
  category: string | null;
  is_repeatable: boolean;
  is_available: boolean;
  is_booked: boolean;
  created_at: string;
};

function fmtPrice(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
}

export default function FlashOwnerClient({
  designs: initialDesigns,
  artistMap,
  artists,
}: {
  designs: FlashDesign[];
  artistMap: Record<string, string>;
  artists: { id: string; name: string }[];
}) {
  const [designs, setDesigns]         = useState<FlashDesign[]>(initialDesigns);
  const [artistFilter, setArtistFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [deleteConfirm, setDeleteConfirm]   = useState<string | null>(null);
  const [error, setError]                   = useState<string | null>(null);
  const [isPending, startTransition]        = useTransition();

  // Derive unique categories from loaded designs
  const categories = Array.from(
    new Set(designs.map((d) => d.category).filter(Boolean))
  ) as string[];

  const filtered = designs
    .filter((d) => !artistFilter   || d.artist_id === artistFilter)
    .filter((d) => !categoryFilter || d.category  === categoryFilter);

  function handleToggle(id: string, next: boolean) {
    startTransition(async () => {
      const result = await toggleFlashAvailability({ id, isAvailable: next });
      if (result.error) { setError(result.error); return; }
      setDesigns((prev) =>
        prev.map((d) => (d.id === id ? { ...d, is_available: next } : d))
      );
    });
  }

  function handleDelete(d: FlashDesign) {
    if (deleteConfirm !== d.id) { setDeleteConfirm(d.id); return; }
    startTransition(async () => {
      const result = await deleteFlashDesignOwner({ id: d.id, imageUrl: d.image_url });
      if (result.error) { setError(result.error); }
      else { setDesigns((prev) => prev.filter((x) => x.id !== d.id)); }
      setDeleteConfirm(null);
    });
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Artist filter */}
        <select
          value={artistFilter}
          onChange={(e) => setArtistFilter(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-zinc-600 transition-colors"
        >
          <option value="">All Artists</option>
          {artists.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>

        {/* Category filter tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {["", ...categories].map((cat) => (
            <button
              key={cat || "all"}
              onClick={() => setCategoryFilter(cat)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                categoryFilter === cat
                  ? "bg-[#c9a84c]/10 text-[#c9a84c] border-[#c9a84c]/30"
                  : "bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-600 hover:text-zinc-300"
              }`}
            >
              {cat || "All"}
            </button>
          ))}
        </div>

        <span className="text-xs text-zinc-600 ml-auto">
          {filtered.length} design{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-[#111] border border-[#1E1E1E] rounded-xl px-6 py-16 text-center">
          <p className="text-zinc-500 text-sm">
            {designs.length === 0
              ? "No flash designs yet. Artists can add designs from their Flash page."
              : "No designs match the selected filters."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((d) => (
            <div
              key={d.id}
              className="bg-[#111] border border-[#1E1E1E] rounded-xl overflow-hidden hover:border-zinc-700 transition-colors"
            >
              {/* Image */}
              <div className="aspect-square overflow-hidden bg-zinc-900 relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.image_url} alt={d.title} className="w-full h-full object-cover" />
                {/* Availability overlay badge */}
                {!d.is_available && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-[9px] uppercase tracking-widest text-zinc-400 bg-black/60 px-2 py-1 rounded">
                      Hidden
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3 space-y-2">
                <p className="text-sm font-medium text-[#E8E8E8] truncate">{d.title}</p>
                <p className="text-[#c9a84c] text-xs font-semibold">{fmtPrice(d.price)}</p>

                {/* Artist + category */}
                <div className="flex flex-wrap gap-1">
                  <span className="text-[9px] uppercase tracking-wide bg-white/[0.04] text-zinc-500 px-1.5 py-0.5 border border-white/[0.06]">
                    {artistMap[d.artist_id] ?? "—"}
                  </span>
                  {d.category && (
                    <span className="text-[9px] uppercase tracking-wide bg-white/[0.04] text-zinc-500 px-1.5 py-0.5 border border-white/[0.06]">
                      {d.category}
                    </span>
                  )}
                  {!d.is_repeatable && (
                    <span className="text-[9px] uppercase tracking-wide bg-[#c9a84c]/10 text-[#c9a84c] px-1.5 py-0.5 border border-[#c9a84c]/20">
                      1×
                    </span>
                  )}
                  {d.is_booked && (
                    <span className="text-[9px] uppercase tracking-wide bg-green-500/10 text-green-400 px-1.5 py-0.5 border border-green-500/20">
                      Booked
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-0.5">
                  <button
                    onClick={() => handleToggle(d.id, !d.is_available)}
                    disabled={isPending}
                    className={`flex-1 text-xs py-1.5 px-2 rounded-lg border transition-colors disabled:opacity-50 ${
                      d.is_available
                        ? "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                        : "border-[#c9a84c]/30 text-[#c9a84c] hover:bg-[#c9a84c]/10"
                    }`}
                  >
                    {d.is_available ? "Hide" : "Show"}
                  </button>
                  <button
                    onClick={() => handleDelete(d)}
                    disabled={isPending}
                    className={`flex-1 text-xs py-1.5 px-2 rounded-lg transition-colors disabled:opacity-50 ${
                      deleteConfirm === d.id
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "border border-zinc-700 text-zinc-500 hover:text-red-400 hover:border-red-800"
                    }`}
                  >
                    {deleteConfirm === d.id ? "Sure?" : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
