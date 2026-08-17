"use client";

import { useState, useTransition } from "react";
import { saveArtistStyles } from "@/app/(artist)/artist/portfolio/actions";

const STYLES = [
  "Traditional", "Neo-traditional", "Japanese", "Blackwork", "Realism",
  "Watercolor", "Geometric", "Tribal", "Fine line", "Illustrative",
  "New school", "Chicano", "Portrait", "Surrealism", "Minimalist",
];

interface Props {
  artistId: string;
  initialStyles: string[];
}

export default function StyleSelector({ artistId, initialStyles }: Props) {
  const [active, setActive] = useState<string[]>(initialStyles);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = (style: string) => {
    const next = active.includes(style) ? active.filter((s) => s !== style) : [...active, style];
    setActive(next);
    setError(null);
    startTransition(async () => {
      const result = await saveArtistStyles(artistId, next);
      if (result.error) setError(result.error);
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-zinc-500">Accepted styles <span className="text-zinc-400">— clients can filter by these</span></p>
        {isPending && <span className="text-xs text-zinc-400">Saving…</span>}
      </div>
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {STYLES.map((style) => (
          <button
            key={style}
            onClick={() => toggle(style)}
            className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
              active.includes(style)
                ? "bg-violet-600 text-white border-violet-600"
                : "border-zinc-200 text-zinc-500 hover:border-violet-300 hover:text-violet-600"
            }`}
          >
            {style}
          </button>
        ))}
      </div>
    </div>
  );
}
