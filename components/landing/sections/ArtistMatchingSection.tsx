import { Star, Clock, XCircle, CheckCircle } from "lucide-react";

const artists = [
  {
    initials: "SM",
    name: "Sarah M.",
    styles: ["Blackwork", "Dotwork", "Geometric"],
    rating: 5,
    next: "Tue 2:00 PM",
    available: true,
    match: 98,
    highlight: true,
  },
  {
    initials: "JR",
    name: "Jake R.",
    styles: ["Neo-Traditional", "Color", "Illustrative"],
    rating: 4,
    next: "Thu 10:00 AM",
    available: true,
    match: 72,
    highlight: false,
  },
  {
    initials: "MC",
    name: "Mia C.",
    styles: ["Fine Line", "Minimal", "Botanical"],
    rating: 5,
    next: null,
    available: false,
    match: 61,
    highlight: false,
  },
];

const criteria = [
  "Style match — blackwork goes to blackwork artists",
  "Portfolio match — client references vs. artist's actual work",
  "Availability match — only open slots receive new leads",
  "Waitlist — fully booked artists capture demand without losing clients",
];

export default function ArtistMatchingSection() {
  return (
    <section className="px-6 py-24" style={{ backgroundColor: "#070707" }}>
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left: artist cards */}
          <div className="space-y-3">
            {artists.map((artist) => (
              <div
                key={artist.name}
                className={`border p-5 flex items-start gap-4 transition-all ${
                  artist.highlight
                    ? "border-gold/35 bg-gold/[0.04]"
                    : "border-white/[0.07] bg-zinc-900/30"
                }`}
              >
                <div className={`w-10 h-10 flex items-center justify-center shrink-0 ${
                  artist.highlight ? "bg-gold/15 border border-gold/30" : "bg-zinc-800 border border-white/[0.08]"
                }`}>
                  <span className={`font-cinzel text-xs font-bold ${artist.highlight ? "text-gold" : "text-zinc-400"}`}>
                    {artist.initials}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-medium text-white">{artist.name}</span>
                    {artist.highlight && (
                      <span className="label-xs text-black bg-gold px-2 py-0.5 shrink-0">Top Match</span>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 mb-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-2.5 h-2.5 ${i < artist.rating ? "text-gold fill-gold" : "text-zinc-700"}`} />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {artist.styles.map((s) => (
                      <span key={s} className="text-[10px] bg-zinc-800 border border-white/[0.07] text-zinc-500 px-1.5 py-0.5">
                        {s}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {artist.available ? (
                      <>
                        <Clock className="w-3 h-3 text-green-400" />
                        <span className="text-[10px] text-zinc-500">Next: {artist.next}</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3 text-red-400" />
                        <span className="text-[10px] text-zinc-600">Fully booked — Waitlist open</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className={`font-cinzel text-lg font-bold ${
                    artist.match >= 90 ? "text-green-400" : artist.match >= 70 ? "text-gold" : "text-zinc-600"
                  }`}>
                    {artist.match}%
                  </div>
                  <div className="text-[9px] text-zinc-700 uppercase tracking-widest">match</div>
                </div>
              </div>
            ))}
          </div>

          {/* Right: copy */}
          <div>
            <p className="label-xs text-gold/70 mb-4">Smart Routing</p>
            <h2 className="font-cinzel text-3xl md:text-4xl font-bold tracking-wide mb-5">
              Every inquiry routed to the right artist, automatically.
            </h2>
            <p className="text-zinc-500 text-sm leading-relaxed mb-8 max-w-md">
              InkBook matches clients to artists based on style compatibility, portfolio alignment, and real-time availability. No more &ldquo;who should handle this?&rdquo; debates. The right artist gets the right client, every time.
            </p>
            <ul className="space-y-3">
              {criteria.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <CheckCircle className="w-3.5 h-3.5 text-gold shrink-0 mt-0.5" />
                  <span className="text-zinc-400 text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </section>
  );
}
