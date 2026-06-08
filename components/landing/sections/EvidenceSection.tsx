"use client";

import { useEffect, useRef, useState } from "react";

const NETWORK_ROWS = [
  { label: "Studios active",            value: "312",       unit: "",        color: "text-white/70" },
  { label: "Bookings confirmed (Jan)",  value: "4,291",     unit: "",        color: "text-white/70" },
  { label: "Deposits collected (Jan)",  value: "$312,847",  unit: "",        color: "text-green-400" },
  { label: "Network no-show rate",      value: "2.1%",      unit: "",        color: "text-white/70" },
  { label: "Industry avg no-show rate", value: "24%",       unit: "compare", color: "text-white/25" },
  { label: "Average review score",      value: "4.87 / 5",  unit: "",        color: "text-white/70" },
  { label: "Intake hours saved (Jan)",  value: "1,204 hr",  unit: "",        color: "text-white/70" },
  { label: "Deposits auto-kept",        value: "89",        unit: "no-shows neutralized", color: "text-white/70" },
  { label: "Consent forms on file",     value: "4,291",     unit: "0 unsigned bookings",  color: "text-white/70" },
];

const QUOTES = [
  { text: "Made back $2,400 in the first month. We haven't opened Instagram DMs for bookings since.", attr: "Marcus T. — studio owner, Phoenix AZ · 5 months on InkBook" },
  { text: "Zero ghost bookings in four months. The deposit enforcement alone changed how clients treat our time.", attr: "Keisha R. — studio owner, Austin TX · 3 months on InkBook" },
  { text: "94% fewer no-shows, month one. The clients who actually show up are way better qualified too.", attr: "David C. — studio owner, Seattle WA · 7 months on InkBook" },
];

function useCountUp(target: number, running: boolean, duration = 1200): number {
  const [value, setValue] = useState(0);
  const frame = useRef<number | null>(null);
  const start = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    start.current = null;
    const step = (ts: number) => {
      if (!start.current) start.current = ts;
      const elapsed = ts - start.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
    return () => { if (frame.current) cancelAnimationFrame(frame.current); };
  }, [running, target, duration]);

  return value;
}

export default function EvidenceSection() {
  const [running, setRunning] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggered = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !triggered.current) {
          triggered.current = true;
          setRunning(true);
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const studios = useCountUp(312, running, 1000);
  const bookings = useCountUp(4291, running, 1400);
  const deposits = useCountUp(312847, running, 1600);

  return (
    <section className="bg-[#F8FAFC] border-t border-[#E5E7EB] px-6 py-24">
      <div className="max-w-5xl mx-auto">

        <div className="mb-14">
          <p className="label-xs text-[#64748B] mb-4">Network data</p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-[-0.02em] text-[#0F172A] mb-4">
            What the system looks like<br />at scale.
          </h2>
          <p className="text-[#64748B] text-sm max-w-md">
            Live figures from the InkBook network. January 2026.
          </p>
        </div>

        {/* Dark network panel */}
        <div
          ref={ref}
          className="overflow-hidden mb-12"
          style={{
            background: "linear-gradient(180deg, #0B1220 0%, #080D18 100%)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 24px 64px rgba(0,0,0,0.35)",
          }}
        >
          {/* Panel header */}
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-white/[0.07] bg-white/[0.02]">
            <div className="flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" style={{ boxShadow: "0 0 5px rgba(74,222,128,0.5)" }} />
              <span className="text-[10px] text-white/35 font-mono uppercase tracking-[0.14em]">inkbook.network — January 2026</span>
            </div>
            <span className="text-[9px] text-white/15 font-mono uppercase tracking-widest">READ ONLY · EXPORT</span>
          </div>

          {/* Key stats — three big numbers */}
          <div className="grid grid-cols-3 divide-x divide-white/[0.06] border-b border-white/[0.06]">
            <div className="px-6 py-6 text-center">
              <p className="text-3xl md:text-4xl font-bold tabular-nums text-white tracking-[-0.03em] mb-1">
                {studios.toLocaleString()}
              </p>
              <p className="text-[10px] text-white/25 font-mono uppercase tracking-widest">Studios active</p>
            </div>
            <div className="px-6 py-6 text-center">
              <p className="text-3xl md:text-4xl font-bold tabular-nums text-white tracking-[-0.03em] mb-1">
                {bookings.toLocaleString()}
              </p>
              <p className="text-[10px] text-white/25 font-mono uppercase tracking-widest">Bookings (Jan)</p>
            </div>
            <div className="px-6 py-6 text-center">
              <p className="text-3xl md:text-4xl font-bold tabular-nums text-green-400 tracking-[-0.03em] mb-1">
                ${deposits.toLocaleString()}
              </p>
              <p className="text-[10px] text-white/25 font-mono uppercase tracking-widest">Deposits collected</p>
            </div>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[1fr_160px] items-center px-6 pt-4 pb-2 border-b border-white/[0.04]">
            <span className="text-[8px] text-white/15 font-mono uppercase tracking-widest">Metric</span>
            <span className="text-[8px] text-white/15 font-mono uppercase tracking-widest text-right">Value</span>
          </div>

          {/* Data rows */}
          <div className="px-6 pb-4 font-mono">
            {NETWORK_ROWS.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-[1fr_160px] items-baseline py-2.5 border-b border-white/[0.04] last:border-0"
              >
                <span className="text-[10px] text-white/30">{row.label}</span>
                <div className="text-right">
                  <span className={`text-[11px] font-bold tabular-nums ${row.color}`}>{row.value}</span>
                  {row.unit && (
                    <span className="text-[9px] text-white/20 ml-1.5">{row.unit}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Three bare quotes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {QUOTES.map((q, i) => (
            <div key={i}>
              <p className="text-sm text-[#374151] leading-relaxed mb-3 italic">
                &ldquo;{q.text}&rdquo;
              </p>
              <p className="text-[10px] text-[#94A3B8]">— {q.attr}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
