import type { LucideIcon } from "lucide-react";
import { DollarSign, UserPlus, BadgeCheck, Wallet, CalendarCheck, UserX } from "lucide-react";
import MotionCard from "@/components/ui/MotionCard";

interface Stat {
  label: string;
  value: string;
  sub?: string;
  /** true when value is "—" because the denominator is 0 (not enough data yet) — dims the value instead of implying a real 0%. */
  unavailable?: boolean;
}

const ICONS: LucideIcon[] = [DollarSign, UserPlus, BadgeCheck, Wallet, CalendarCheck, UserX];

export default function StatsGrid({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {stats.map((s, i) => {
        const Icon = ICONS[i] ?? DollarSign;
        return (
          <MotionCard
            key={s.label}
            className="premium-card hover:shadow-elevation-4 transition-shadow duration-200 relative overflow-hidden p-5"
          >
            {/* Ambient accent surface — decorative corner glow, part of the
                same layer as the icon chip below (both move together on
                parallax, one step "closer" to the viewer than the card body). */}
            <div
              data-parallax
              data-parallax-strength="4"
              className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-violet-500/10 blur-xl pointer-events-none"
              aria-hidden
            />
            <div
              data-parallax
              data-parallax-strength="8"
              className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 text-white flex items-center justify-center mb-3.5 shadow-[0_4px_10px_-2px_rgba(124,58,237,0.45)]"
            >
              <Icon size={18} strokeWidth={2.25} />
            </div>
            <p className={`relative text-[26px] leading-none font-bold tracking-tight ${s.unavailable ? "text-zinc-300" : "text-zinc-900"}`}>{s.value}</p>
            <p className="relative text-sm text-zinc-500 mt-1.5">{s.label}</p>
            {s.sub && <p className="relative text-xs text-zinc-400 mt-1">{s.sub}</p>}
          </MotionCard>
        );
      })}
    </div>
  );
}
