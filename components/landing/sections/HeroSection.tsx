"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const AI_STATES = [
  "Analyzing style preference — Blackwork detected",
  "Qualifying budget range · $400–$600",
  "Lead brief ready — routing to matched artist",
  "Artist notified · Sarah M. · 98% match",
];

export default function HeroSection() {
  const [aiIdx, setAiIdx] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setAiIdx((i) => (i + 1) % AI_STATES.length), 2800);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative min-h-[100svh] flex flex-col items-center justify-center px-6 pt-24 pb-20 overflow-hidden">
      {/* Background radial glow — top center */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -5%, rgba(139,92,246,0.09) 0%, transparent 60%)",
        }}
      />

      {/* Eyebrow */}
      <div
        className={`flex items-center gap-2 mb-8 transition-opacity duration-700 ${
          mounted ? "opacity-100" : "opacity-0"
        }`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot shrink-0" />
        <span className="text-[11px] tracking-[0.18em] uppercase text-zinc-500 font-medium">
          Now in early access · 500+ studios
        </span>
      </div>

      {/* Headline */}
      <h1
        className={`text-[clamp(2.75rem,8vw,6rem)] font-bold tracking-[-0.03em] leading-[0.95] text-center text-balance text-white max-w-4xl mb-6 transition-all duration-700 delay-75 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        Run your studio.{" "}
        <span className="text-zinc-500">Not your tools.</span>
      </h1>

      {/* Subhead */}
      <p
        className={`text-[clamp(0.9375rem,1.8vw,1.125rem)] text-zinc-400 text-center max-w-lg leading-relaxed mb-10 transition-all duration-700 delay-150 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        From the first inquiry to the five-star review — InkBook runs your
        studio for you.
      </p>

      {/* CTAs */}
      <div
        className={`flex flex-col sm:flex-row items-center gap-3 mb-10 transition-all duration-700 delay-[225ms] ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <Link
          href="#"
          className="h-11 px-7 bg-white text-black text-[13px] font-semibold hover:bg-zinc-100 transition-colors duration-200 flex items-center gap-2 group"
        >
          Start free trial
          <span className="group-hover:translate-x-0.5 transition-transform duration-150" aria-hidden>
            →
          </span>
        </Link>
        <Link
          href="#"
          className="h-11 px-7 border border-white/[0.12] text-zinc-400 text-[13px] hover:border-white/25 hover:text-white transition-all duration-200 flex items-center"
        >
          Book a demo
        </Link>
      </div>

      {/* Social proof */}
      <div
        className={`flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-16 transition-all duration-700 delay-300 ${
          mounted ? "opacity-100" : "opacity-0"
        }`}
      >
        {["500+ studios", "$2.4M deposits protected", "94% fewer no-shows"].map(
          (item) => (
            <span
              key={item}
              className="flex items-center gap-1.5 text-[11px] text-zinc-600"
            >
              <span className="w-1 h-1 rounded-full bg-zinc-700 inline-block shrink-0" />
              {item}
            </span>
          )
        )}
      </div>

      {/* Product UI */}
      <div
        className={`w-full max-w-[480px] mx-auto relative transition-all duration-700 delay-[375ms] ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
      >
        {/* Glow behind panel */}
        <div
          className="absolute -inset-px -z-10 opacity-30 blur-2xl rounded-sm"
          style={{
            background:
              "radial-gradient(ellipse, rgba(139,92,246,0.6), transparent 70%)",
          }}
        />

        {/* Inquiry panel */}
        <div className="border border-white/[0.08] bg-[rgba(255,255,255,0.02)] overflow-hidden">
          {/* Header */}
          <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <span className="text-[10px] tracking-[0.16em] uppercase text-zinc-600 font-medium">
              InkBook Intake
            </span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
              <span className="text-[11px] text-emerald-500 font-medium">Live</span>
            </div>
          </div>

          {/* Client row */}
          <div className="px-5 py-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 border border-white/10 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-semibold text-zinc-500">JM</span>
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Jordan M.</div>
                  <div className="text-[11px] text-zinc-600">Just now · (512) 555-0182</div>
                </div>
              </div>
              <div className="shrink-0 px-2 py-0.5 text-[10px] font-medium tracking-[0.1em] uppercase bg-violet-500/10 border border-violet-500/20 text-violet-400">
                AI Review
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-2.5">
              {[
                ["Style", "Blackwork geometric"],
                ["Placement", "Full sleeve · forearm"],
                ["Size", "10–12 inches"],
                ["Budget", "$400–$600"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <span className="text-[11px] text-zinc-600">{k}</span>
                  <span className="text-[11px] text-zinc-300">{v}</span>
                </div>
              ))}
            </div>

            {/* AI status */}
            <div className="mt-5 pt-4 border-t border-white/[0.05] flex items-center gap-2.5">
              <div className="flex gap-0.5 shrink-0">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1 h-1 rounded-full bg-violet-400 animate-pulse-dot"
                    style={{ animationDelay: `${i * 220}ms` }}
                  />
                ))}
              </div>
              <span className="text-[11px] text-zinc-500 transition-all duration-500">
                {AI_STATES[aiIdx]}
              </span>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 divide-x divide-white/[0.06] border-x border-b border-white/[0.08]">
          {[
            { label: "Revenue", val: "$12,840", sub: "↑ +18% this mo." },
            { label: "Bookings", val: "47", sub: "this month" },
            { label: "Dep. Rate", val: "94%", sub: "auto-collected" },
          ].map(({ label, val, sub }) => (
            <div key={label} className="px-4 py-3">
              <div className="text-[9px] tracking-[0.14em] uppercase text-zinc-700 mb-1">
                {label}
              </div>
              <div className="text-sm font-semibold text-white tabular-nums">
                {val}
              </div>
              <div className="text-[10px] text-zinc-700 mt-0.5">{sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
