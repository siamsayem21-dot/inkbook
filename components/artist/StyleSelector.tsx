"use client";

import { useState } from "react";

const STYLES = [
  "Traditional", "Neo-traditional", "Japanese", "Blackwork", "Realism",
  "Watercolor", "Geometric", "Tribal", "Fine line", "Illustrative",
  "New school", "Chicano", "Portrait", "Surrealism", "Minimalist",
];

interface Props {
  selected?: string[];
  onChange?: (styles: string[]) => void;
}

export default function StyleSelector({ selected = [], onChange }: Props) {
  const [active, setActive] = useState<string[]>(selected);

  const toggle = (style: string) => {
    const next = active.includes(style) ? active.filter((s) => s !== style) : [...active, style];
    setActive(next);
    onChange?.(next);
  };

  return (
    <div>
      <p className="text-sm text-zinc-400 mb-3">Accepted styles (clients can filter by these)</p>
      <div className="flex flex-wrap gap-2">
        {STYLES.map((style) => (
          <button
            key={style}
            onClick={() => toggle(style)}
            className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
              active.includes(style)
                ? "bg-white text-black border-white"
                : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300"
            }`}
          >
            {style}
          </button>
        ))}
      </div>
    </div>
  );
}
