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
            className="bg-white rounded-2xl border border-zinc-200 shadow-sm hover:shadow-elevation-3 p-5"
          >
            <div className="w-9 h-9 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center mb-3">
              <Icon size={17} />
            </div>
            <p className={`text-2xl font-bold ${s.unavailable ? "text-zinc-300" : "text-zinc-900"}`}>{s.value}</p>
            <p className="text-sm text-zinc-500 mt-0.5">{s.label}</p>
            {s.sub && <p className="text-xs text-zinc-400 mt-1">{s.sub}</p>}
          </MotionCard>
        );
      })}
    </div>
  );
}
