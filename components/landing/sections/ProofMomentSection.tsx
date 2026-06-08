"use client";

import { useEffect, useRef, useState } from "react";

const LOG_ENTRIES = [
  { time: "02:01 AM", module: "INTAKE",  event: "Client inquiry received",          detail: "Jordan M. · Blackwork sleeve · wolf geometric · forearm" },
  { time: "02:01 AM", module: "AI",      event: "AI consultation started",           detail: "Style detection · reference image analysis · budget qualification" },
  { time: "02:03 AM", module: "AI",      event: "Lead qualified — score 94/100",     detail: "Blackwork · $400–600 · 6 inches · forearm · routing to best match" },
  { time: "02:03 AM", module: "ROUTING", event: "Routed to Sarah M.",                detail: "Style match 98% · Utilization 90% · Next available: Tue 2:00 PM" },
  { time: "02:03 AM", module: "NOTIFY",  event: "Artist notification sent",          detail: "Lead brief delivered · SMS + in-app · Sarah M. has 6 hr to respond" },
  { time: "02:47 AM", module: "FINANCE", event: "Deposit collected — $280.00",       detail: "Stripe · Visa ···· 4242 · Non-refundable · Booking slot held" },
  { time: "02:48 AM", module: "CONSENT", event: "Consent form sent to client",       detail: "State of Texas · Adult form · Digital signature required" },
  { time: "03:12 AM", module: "CONSENT", event: "Consent signed",                    detail: "Jordan Martinez · Feb 10 · 3:12 AM · IP logged · Stored permanently" },
  { time: "03:12 AM", module: "BOOKING", event: "Booking #BK-9201 confirmed",        detail: "Feb 12 · 2:00 PM · Sarah M. · Calendar blocked · SMS reminders set" },
  { time: "08:14 AM", module: "SYSTEM",  event: "Artist dashboard opened",           detail: "Sarah M. · 1 confirmed booking · $280 deposit held · Ready to review" },
];

// Variable timing mirrors real event pacing:
// Fast cluster (AI, routing) → long pause (client paying) → medium pause (signing) → sleep gap → morning
const ITEM_DELAYS_MS = [600, 200, 600, 150, 150, 1800, 400, 1200, 200, 3200, 300];

type DisplayItem =
  | { kind: "entry"; data: (typeof LOG_ENTRIES)[number] }
  | { kind: "gap" };

const DISPLAY_ITEMS: DisplayItem[] = [
  ...LOG_ENTRIES.slice(0, 9).map((data) => ({ kind: "entry" as const, data })),
  { kind: "gap" },
  { kind: "entry", data: LOG_ENTRIES[9] },
];

const MODULE_COLORS: Record<string, string> = {
  INTAKE:  "text-blue-400",
  AI:      "text-purple-400",
  ROUTING: "text-blue-400",
  NOTIFY:  "text-[#64748B]",
  FINANCE: "text-green-400",
  CONSENT: "text-[#94A3B8]",
  BOOKING: "text-green-400",
  SYSTEM:  "text-[#52525B]",
};

export default function ProofMomentSection() {
  const [visible, setVisible] = useState(0);
  const [cursor, setCursor] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          let i = 0;
          const tick = () => {
            i++;
            setVisible(i);
            if (i < ITEM_DELAYS_MS.length) {
              setTimeout(tick, ITEM_DELAYS_MS[i]);
            }
          };
          setTimeout(tick, ITEM_DELAYS_MS[0]);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);

    const cursorInterval = setInterval(() => setCursor((c) => !c), 530);
    return () => {
      observer.disconnect();
      clearInterval(cursorInterval);
    };
  }, []);

  return (
    <section
      className="relative px-6 py-24 border-t border-white/[0.06] overflow-hidden"
      style={{ background: "linear-gradient(180deg, #080D18 0%, #0B1220 100%)" }}
    >
      {/* Subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto">

        {/* Clock — primary visual anchor */}
        <div className="mb-10">
          <p className="label-xs text-white/20 mb-6 uppercase tracking-[0.15em]">System log · Overnight run · Feb 10–11, 2026</p>
          <div className="flex items-end gap-4 mb-6">
            <div className="flex items-baseline gap-3 leading-none">
              <span
                className="font-bold tabular-nums text-white tracking-[-0.05em]"
                style={{ fontSize: "clamp(4.5rem, 12vw, 8rem)", lineHeight: 1 }}
              >
                2:14
              </span>
              <span className="text-2xl md:text-3xl font-semibold text-white/40 mb-1">AM</span>
            </div>
          </div>
          <h2 className="text-xl md:text-2xl font-semibold text-white/70 mb-2 tracking-[-0.01em]">
            The OS runs while you sleep.
          </h2>
          <p className="text-white/35 text-sm max-w-lg leading-relaxed">
            Jordan M. submitted an inquiry at 2:01 AM. By 3:12 AM the deposit was collected, consent signed, and booking confirmed — without a single human action.
          </p>
        </div>

        {/* Log panel */}
        <div
          ref={ref}
          className="border border-white/[0.08] overflow-hidden mb-12"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}
        >
          {/* Log header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.08] bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" style={{ boxShadow: "0 0 6px rgba(74,222,128,0.5)" }} />
              <span className="text-[10px] text-white/35 font-mono uppercase tracking-[0.12em]">inkbook.system.log</span>
            </div>
            <span className="text-[10px] text-white/20 font-mono">Studio: Ink & Iron · Phoenix AZ</span>
          </div>

          {/* Column headers */}
          <div className="flex items-center gap-4 px-5 pt-3 pb-2 border-b border-white/[0.04]">
            <span className="text-[8px] text-white/15 font-mono uppercase tracking-widest w-16 shrink-0">Time</span>
            <span className="text-[8px] text-white/15 font-mono uppercase tracking-widest w-16 shrink-0">Module</span>
            <span className="text-[8px] text-white/15 font-mono uppercase tracking-widest flex-1">Event</span>
            <span className="text-[8px] text-white/15 font-mono uppercase tracking-widest w-6 shrink-0 text-right">OK</span>
          </div>

          {/* Entries */}
          <div className="px-5 py-3 space-y-0 font-mono">
            {DISPLAY_ITEMS.map((item, i) => {
              const shown = i < visible;

              if (item.kind === "gap") {
                return (
                  <div
                    key="gap"
                    className={`flex items-center gap-4 py-4 border-b border-white/[0.04] transition-opacity duration-500 ${shown ? "opacity-100" : "opacity-0"}`}
                  >
                    <div className="flex-1 border-t border-dashed border-white/[0.08]" />
                    <span className="text-[9px] text-white/20 font-mono uppercase tracking-[0.12em] shrink-0">
                      — Studio closed · 6 hours · Artists asleep —
                    </span>
                    <div className="flex-1 border-t border-dashed border-white/[0.08]" />
                  </div>
                );
              }

              const entry = item.data;
              return (
                <div
                  key={i}
                  className={`flex items-start gap-4 py-2.5 border-b border-white/[0.04] last:border-0 transition-opacity duration-200 ${shown ? "opacity-100" : "opacity-0"}`}
                >
                  <span className="text-[10px] text-white/20 shrink-0 tabular-nums w-16">{entry.time}</span>
                  <span className={`text-[9px] uppercase tracking-[0.12em] shrink-0 w-16 font-bold ${MODULE_COLORS[entry.module] ?? "text-white/40"}`}>
                    {entry.module}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-white/65 font-medium">{entry.event}</p>
                    <p className="text-[10px] text-white/25 mt-0.5 leading-relaxed">{entry.detail}</p>
                  </div>
                  <span className="text-[9px] text-green-400/60 shrink-0 w-6 text-right">OK</span>
                </div>
              );
            })}

            {/* Cursor appears after all entries */}
            {visible >= DISPLAY_ITEMS.length && (
              <div className="flex items-center gap-4 pt-2.5">
                <span className="text-[10px] text-white/20 w-16 tabular-nums">—</span>
                <span className="text-[9px] text-white/20 w-16 uppercase tracking-[0.12em]">SYSTEM</span>
                <span className="text-[10px] text-white/25" style={{ opacity: cursor ? 1 : 0, transition: "opacity 80ms" }}>▋</span>
              </div>
            )}
          </div>
        </div>

        {/* Closing statement — display scale */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
          <div>
            <p className="text-2xl md:text-3xl font-bold text-white tracking-[-0.02em] leading-tight mb-2">
              Sarah M. slept through all of it.
            </p>
            <p className="text-white/40 text-base">The OS didn&apos;t.</p>
          </div>
          <div className="border border-white/[0.10] px-6 py-4 shrink-0">
            <p className="text-white text-2xl font-bold tabular-nums tracking-[-0.02em]">74%</p>
            <p className="text-[10px] text-white/30 uppercase tracking-[0.12em] mt-1">of bookings completed<br />outside studio hours</p>
          </div>
        </div>
      </div>
    </section>
  );
}
