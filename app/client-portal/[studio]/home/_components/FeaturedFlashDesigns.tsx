"use client";

import { useState } from "react";
import { Bookmark } from "lucide-react";
import { TwinBladeArt, WildRoseArt, SacredCompassArt } from "./FlashArt";

const FLASH_ART = { swords: TwinBladeArt, flower: WildRoseArt, compass: SacredCompassArt } as const;

export interface FlashDesignItem {
  id: string;
  title: string;
  category: string;
  // Real flash art (from the flash_designs table) sets imageUrl. Cards
  // without one (today's mock fallback) render as an illustrated flash-sheet
  // placeholder instead — see home/mock-data.ts for why.
  imageUrl?: string;
  objectPosition?: string; // CSS object-position for imageUrl, e.g. "50% 30%"
  icon?: keyof typeof FLASH_ART;
}

interface Props {
  designs: FlashDesignItem[];
}

export default function FeaturedFlashDesigns({ designs }: Props) {
  const [saved, setSaved] = useState<Set<string>>(new Set());

  function toggleSave(id: string) {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 h-full">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-zinc-900">Featured Flash Designs</h2>
        <span title="Coming soon" className="text-xs font-medium text-zinc-300 cursor-not-allowed select-none">
          View all
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {designs.map((d) => {
          const isSaved = saved.has(d.id);
          const Art = d.icon ? FLASH_ART[d.icon] : null;
          return (
            <div key={d.id} className="group">
              <div className="relative aspect-[4/5] rounded-xl overflow-hidden mb-2.5 ring-1 ring-inset ring-black/[0.06]">
                {d.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={d.imageUrl}
                    alt={d.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                    style={{ objectPosition: d.objectPosition ?? "center" }}
                  />
                ) : (
                  <div
                    className="relative w-full h-full flex items-center justify-center"
                    style={{ background: "linear-gradient(160deg, #FBF7EE 0%, #F3ECDC 100%)" }}
                  >
                    {/* Flash-sheet corner registration marks — top-right left clear for the bookmark badge */}
                    <span className="absolute top-2.5 left-2.5 w-2 h-2 border-t border-l border-zinc-400/50" />
                    <span className="absolute bottom-2.5 left-2.5 w-2 h-2 border-b border-l border-zinc-400/50" />
                    <span className="absolute bottom-2.5 right-2.5 w-2 h-2 border-b border-r border-zinc-400/50" />
                    {Art && (
                      <Art className="w-[64%] h-[64%] text-zinc-800/90 transition-transform duration-300 group-hover:scale-110" />
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => toggleSave(d.id)}
                  aria-label={isSaved ? "Remove bookmark" : "Save design"}
                  className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-sm hover:bg-white transition-colors"
                >
                  <Bookmark size={14} className={isSaved ? "fill-violet-600 text-violet-600" : "text-zinc-500"} />
                </button>
              </div>
              <p className="text-sm font-medium text-zinc-900 truncate">{d.title}</p>
              <p className="text-xs text-zinc-400">{d.category}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
