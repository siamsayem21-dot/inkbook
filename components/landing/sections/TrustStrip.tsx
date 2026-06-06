import { Shield, TrendingUp, Target } from "lucide-react";

const items = [
  {
    Icon: Shield,
    headline: "Built for modern tattoo studios",
    body: "Purpose-built for the USA & Canada tattoo industry — not a generic booking tool.",
  },
  {
    Icon: TrendingUp,
    headline: "Reduce no-shows",
    body: "Mandatory deposits and automated SMS reminders keep every client accountable.",
  },
  {
    Icon: Target,
    headline: "Increase booking conversions",
    body: "AI qualifies every inquiry before it reaches your artist, filtering out tire-kickers.",
  },
];

export default function TrustStrip() {
  return (
    <div className="border-y border-white/[0.06] bg-zinc-950/60">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/[0.06]">
        {items.map((item) => (
          <div key={item.headline} className="px-8 py-8 flex items-start gap-4">
            <div className="w-8 h-8 border border-gold/25 flex items-center justify-center shrink-0 mt-0.5">
              <item.Icon className="w-3.5 h-3.5 text-gold" />
            </div>
            <div>
              <p className="text-sm font-medium text-white mb-1">{item.headline}</p>
              <p className="text-xs text-zinc-600 leading-relaxed">{item.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
