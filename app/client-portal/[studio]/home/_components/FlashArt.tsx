// Hand-drawn placeholder flash-sheet illustrations for the Home page's
// Featured Flash Designs mock cards (home/mock-data.ts) — no real flash
// artwork exists in the project's assets (public/tattoo/ is lifestyle
// photography only). Stroke-only, currentColor, so each reads as clean
// black/gray line-art on the parchment card background rather than a
// generic icon. Swap a card for a real `imageUrl` once actual flash art
// is uploaded.

interface ArtProps {
  className?: string;
}

export function TwinBladeArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <g transform="rotate(-45 50 50)">
        <path d="M50 4 L57 40 L50 50 L43 40 Z" />
        <line x1="50" y1="12" x2="50" y2="42" strokeWidth="1.1" opacity="0.55" />
        <rect x="30" y="48" width="40" height="6" rx="3" />
        <path d="M30 50 C25 47 22 44 20 40" strokeWidth="1.4" />
        <path d="M70 50 C75 47 78 44 80 40" strokeWidth="1.4" />
        <line x1="44" y1="54" x2="44" y2="82" />
        <line x1="56" y1="54" x2="56" y2="82" />
        <line x1="44" y1="59" x2="56" y2="63" strokeWidth="1.3" />
        <line x1="44" y1="66" x2="56" y2="70" strokeWidth="1.3" />
        <line x1="44" y1="73" x2="56" y2="77" strokeWidth="1.3" />
        <circle cx="50" cy="90" r="6" />
        <line x1="45" y1="90" x2="55" y2="90" strokeWidth="1.1" opacity="0.6" />
      </g>
      <g transform="rotate(45 50 50)">
        <path d="M50 4 L57 40 L50 50 L43 40 Z" />
        <line x1="50" y1="12" x2="50" y2="42" strokeWidth="1.1" opacity="0.55" />
        <rect x="30" y="48" width="40" height="6" rx="3" />
        <path d="M30 50 C25 47 22 44 20 40" strokeWidth="1.4" />
        <path d="M70 50 C75 47 78 44 80 40" strokeWidth="1.4" />
        <line x1="44" y1="54" x2="44" y2="82" />
        <line x1="56" y1="54" x2="56" y2="82" />
        <line x1="44" y1="59" x2="56" y2="63" strokeWidth="1.3" />
        <line x1="44" y1="66" x2="56" y2="70" strokeWidth="1.3" />
        <line x1="44" y1="73" x2="56" y2="77" strokeWidth="1.3" />
        <circle cx="50" cy="90" r="6" />
        <line x1="45" y1="90" x2="55" y2="90" strokeWidth="1.1" opacity="0.6" />
      </g>
    </svg>
  );
}

export function WildRoseArt({ className }: ArtProps) {
  // Big cupped outer petals (5) form the flower's silhouette; smaller inner
  // petals (3) at an offset rotation nest inside to read as the folded rose
  // center, capped with a tiny spiral hinting at the bud curl.
  const outerPetal = "M0 14 C-11 9 -15 -3 -12 -14 C-8 -23 -3 -25 0 -23 C3 -25 8 -23 12 -14 C15 -3 11 9 0 14 Z";
  const innerPetal = "M0 7 C-6 5 -8 -1 -6 -7 C-4 -11 -1 -12 0 -11 C1 -12 4 -11 6 -7 C8 -1 6 5 0 7 Z";

  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M50 62 C46 72 40 82 36 95" strokeWidth="2" />
      <path d="M42 74 C34 71 27 75 24 82 C32 84 39 81 42 74 Z" />
      <path d="M40 87 C33 87 27 91 25 97 C32 98 38 94 40 87 Z" />
      <line x1="38" y1="80" x2="34" y2="78" strokeWidth="1.4" />
      <line x1="35" y1="90" x2="31" y2="89" strokeWidth="1.4" />

      <g transform="translate(50 36)">
        <g transform="rotate(0)"><path d={outerPetal} /></g>
        <g transform="rotate(72)"><path d={outerPetal} /></g>
        <g transform="rotate(144)"><path d={outerPetal} /></g>
        <g transform="rotate(216)"><path d={outerPetal} /></g>
        <g transform="rotate(288)"><path d={outerPetal} /></g>

        <g transform="rotate(36)"><path d={innerPetal} /></g>
        <g transform="rotate(108)"><path d={innerPetal} /></g>
        <g transform="rotate(180)"><path d={innerPetal} /></g>
        <g transform="rotate(252)"><path d={innerPetal} /></g>

        <path d="M-3 3 C-4 -1 -1 -4 3 -3 C6 -2 6 2 2 3 C0 3.5 -1.5 2 -1 0" strokeWidth="1.5" />
      </g>
    </svg>
  );
}

export function SacredCompassArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="50" cy="50" r="40" />
      <circle cx="50" cy="50" r="30" strokeWidth="1.3" />
      <circle cx="50" cy="50" r="20" strokeWidth="1.1" opacity="0.8" />

      <path d="M50 12 L88 50 L50 88 L12 50 Z" />
      <path d="M30.9 30.9 L69.1 30.9 L69.1 69.1 L30.9 69.1 Z" strokeWidth="1.3" />

      {/* major ticks — N E S W + diagonals */}
      <line x1="50" y1="10" x2="50" y2="2" />
      <line x1="78.3" y1="21.7" x2="83.9" y2="16.1" />
      <line x1="90" y1="50" x2="98" y2="50" />
      <line x1="78.3" y1="78.3" x2="83.9" y2="83.9" />
      <line x1="50" y1="90" x2="50" y2="98" />
      <line x1="21.7" y1="78.3" x2="16.1" y2="83.9" />
      <line x1="10" y1="50" x2="2" y2="50" />
      <line x1="21.7" y1="21.7" x2="16.1" y2="16.1" />

      {/* minor ticks */}
      <g strokeWidth="1.2" opacity="0.75">
        <line x1="65.3" y1="13" x2="67.2" y2="8.4" />
        <line x1="87" y1="34.7" x2="91.6" y2="32.8" />
        <line x1="87" y1="65.3" x2="91.6" y2="67.2" />
        <line x1="65.3" y1="87" x2="67.2" y2="91.6" />
        <line x1="34.7" y1="87" x2="32.8" y2="91.6" />
        <line x1="13" y1="65.3" x2="8.4" y2="67.2" />
        <line x1="13" y1="34.7" x2="8.4" y2="32.8" />
        <line x1="34.7" y1="13" x2="32.8" y2="8.4" />
      </g>

      <circle cx="50" cy="50" r="6" strokeWidth="1.3" />
      <circle cx="50" cy="50" r="2.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
