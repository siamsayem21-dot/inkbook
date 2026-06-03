"use client";

import { useState } from "react";
import Link from "next/link";

export type FlashCard = {
  id: string;
  artist_id: string;
  artist_name: string;
  title: string;
  image_url: string;
  price: number;
  category: string | null;
  is_repeatable: boolean;
};

interface Props {
  studioSlug: string;
  designs: FlashCard[];
  brandColor: string;
  textOnBrand: string;
}

export default function FlashSection({
  studioSlug,
  designs,
  brandColor,
  textOnBrand,
}: Props) {
  const [activeCategory, setActiveCategory] = useState("");

  if (designs.length === 0) return null;

  const categories = Array.from(
    new Set(designs.map((d) => d.category).filter(Boolean))
  ) as string[];

  const filtered = activeCategory
    ? designs.filter((d) => d.category === activeCategory)
    : designs;

  return (
    <section className="mt-16">
      {/* Section header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="font-cinzel text-2xl md:text-3xl font-bold tracking-wide">Available Flash</h2>
          <p className="text-zinc-500 text-sm mt-2">
            Ready-made designs — book immediately, no wait time.
          </p>
        </div>
        <span className="label-xs text-zinc-600">{filtered.length} design{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Category filter tabs — pill style */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-7">
          {["", ...categories].map((cat) => (
            <button
              key={cat || "all"}
              onClick={() => setActiveCategory(cat)}
              className={`text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border transition-all duration-200 ${
                activeCategory === cat
                  ? ""
                  : "bg-transparent text-zinc-500 border-white/[0.08] hover:border-white/25 hover:text-zinc-300"
              }`}
              style={
                activeCategory === cat
                  ? { backgroundColor: `${brandColor}20`, color: brandColor, borderColor: `${brandColor}60` }
                  : undefined
              }
            >
              {cat || "All"}
            </button>
          ))}
        </div>
      )}

      {/* Flash grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {filtered.map((d) => (
          <div
            key={d.id}
            className="group bg-zinc-900/50 border border-white/[0.08] hover:border-white/20 transition-all duration-200 overflow-hidden"
          >
            {/* Image */}
            <div className="aspect-square overflow-hidden bg-zinc-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={d.image_url}
                alt={d.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>

            {/* Info */}
            <div className="p-3">
              <p className="text-sm font-semibold text-[#E8E8E8] truncate mb-0.5">{d.title}</p>
              <p className="text-xs font-semibold mb-1" style={{ color: brandColor }}>
                ${(d.price / 100).toFixed(0)}
              </p>
              <p className="text-zinc-600 text-xs mb-2 truncate">by {d.artist_name}</p>

              {/* Badges */}
              <div className="flex flex-wrap gap-1 mb-3">
                {d.category && (
                  <span className="text-[9px] uppercase tracking-wide bg-white/[0.04] text-zinc-500 px-1.5 py-0.5 border border-white/[0.06]">
                    {d.category}
                  </span>
                )}
                {!d.is_repeatable && (
                  <span className="text-[9px] uppercase tracking-wide bg-[#c9a84c]/10 text-[#c9a84c] px-1.5 py-0.5 border border-[#c9a84c]/20">
                    Non-repeatable
                  </span>
                )}
              </div>

              {/* Book button */}
              <Link
                href={`/book/${studioSlug}/flash/${d.id}/book`}
                className="block text-center text-xs font-bold uppercase tracking-widest px-3 py-2 transition-colors"
                style={{ backgroundColor: brandColor, color: textOnBrand }}
              >
                Book This Flash →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
