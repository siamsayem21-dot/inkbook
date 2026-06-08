"use client";

import { useEffect, useRef, useState } from "react";

const OUTCOMES = [
  { word: "Zero", label: "Lost leads", detail: "Every inquiry captured, routed, and followed up automatically.", visual: "funnel" },
  { word: "Automatic", label: "Deposit collection and booking confirmation", detail: "Stripe deposits enforced on every booking. No exceptions.", visual: "bar" },
  { word: "One platform", label: "Every client conversation, project, and record", detail: "Replace 6 disconnected tools with a single connected system.", visual: "nodes" },
  { word: "More time", label: "Tattooing. Less time on admin.", detail: "Artists spend 80% of their day creating. InkBook handles the rest.", visual: "split" },
];

const FUNNEL_H = [40, 31, 21, 15]; // pixel heights (h * 0.4)

function FunnelViz({ animate }: { animate: boolean }) {
  const barRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null]);

  useEffect(() => {
    if (!animate) return;
    const timeout = setTimeout(() => {
      const start = performance.now();
      function tick(now: number) {
        const p = Math.min((now - start) / 900, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        barRefs.current.forEach((el, i) => {
          if (el) el.style.height = `${Math.round(FUNNEL_H[i] * eased)}px`;
        });
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }, 250);
    return () => clearTimeout(timeout);
  }, [animate]);

  return (
    <div style={{ display: "flex", gap: "6px", alignItems: "flex-end", height: "40px" }}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          ref={(el) => { barRefs.current[i] = el; }}
          style={{ flex: 1, height: "0px", background: i === 3 ? "#383838" : "#252525", borderRadius: "2px 2px 0 0" }}
        />
      ))}
    </div>
  );
}

function BarViz({ active }: { active: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <div style={{ height: "3px", background: "#222222", borderRadius: "2px", overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, background: "#E8E0D0", transform: active ? "scaleX(1)" : "scaleX(0)", transformOrigin: "left", transition: "transform 900ms 300ms var(--ease-out)" }} />
      </div>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "#E8E0D0", opacity: active ? 1 : 0, transition: "opacity 400ms 900ms" }}>
        Deposit collected — 100%
      </span>
    </div>
  );
}

function NodesViz({ active }: { active: boolean }) {
  const nodes = 6;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
      {Array.from({ length: nodes }).map((_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{
            width: "8px", height: "8px", borderRadius: "50%",
            background: i === 2 ? (active ? "#E8E0D0" : "#222222") : (active ? "#383838" : "#222222"),
            border: `1px solid ${active ? "#383838" : "#2A2A2A"}`,
            opacity: active ? 1 : 0,
            transition: `background 400ms ${i * 80}ms var(--ease-out), opacity 300ms ${i * 60}ms var(--ease-out), border-color 300ms ${i * 60}ms`,
          }} />
          {i < nodes - 1 && (
            <div style={{ width: "12px", height: "1px", background: active ? "#383838" : "#222222", opacity: active ? 1 : 0, transition: `opacity 300ms ${i * 60 + 80}ms` }} />
          )}
        </div>
      ))}
    </div>
  );
}

function SplitViz({ animate, active }: { animate: boolean; active: boolean }) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!animate || !barRef.current) return;
    const el = barRef.current;
    const timeout = setTimeout(() => {
      const start = performance.now();
      function tick(now: number) {
        const p = Math.min((now - start) / 1000, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.style.width = `${Math.round(80 * eased)}%`;
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }, 400);
    return () => clearTimeout(timeout);
  }, [animate]);

  return (
    <div style={{ display: "flex", gap: "3px", height: "12px" }}>
      <div ref={barRef} style={{ width: "0%", background: "#E8E0D0", borderRadius: "2px", display: "flex", alignItems: "center", overflow: "hidden", minWidth: 0 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "8px", color: "#0A0A0A", paddingLeft: "6px", whiteSpace: "nowrap", opacity: active ? 1 : 0, transition: "opacity 400ms 1100ms" }}>
          Tattooing 80%
        </span>
      </div>
      <div style={{ flex: 1, background: "#252525", borderRadius: "2px" }} />
    </div>
  );
}

function getViz(visual: string, inView: boolean) {
  if (visual === "funnel") return <FunnelViz animate={inView} />;
  if (visual === "bar") return <BarViz active={inView} />;
  if (visual === "nodes") return <NodesViz active={inView} />;
  if (visual === "split") return <SplitViz animate={inView} active={inView} />;
  return null;
}

export default function StatsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setInView(true); observer.disconnect(); }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} style={{ padding: "128px 0", background: "#0A0A0A" }}>
      <div className="mx-auto" style={{ maxWidth: "1120px", padding: "0 40px" }}>
        <div className="text-center mb-16">
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#525252", marginBottom: "24px", opacity: inView ? 1 : 0, transform: inView ? "none" : "translateY(16px)", transition: "opacity 600ms var(--ease-out), transform 600ms var(--ease-out)" }}>
            The Results
          </p>
          <h2 className="mx-auto" style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(32px, 4vw, 56px)", color: "#F5F5F5", lineHeight: "1.1", maxWidth: "640px", opacity: inView ? 1 : 0, transform: inView ? "none" : "translateY(20px)", transition: "opacity 700ms 80ms var(--ease-out), transform 700ms 80ms var(--ease-out)" }}>
            Studios on InkBook convert more inquiries into paid bookings.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px" style={{ background: "#2A2A2A", borderRadius: "14px", overflow: "hidden", border: "1px solid #2A2A2A", boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.8)" }}>
          {OUTCOMES.map(({ word, label, detail, visual }, i) => (
            <div
              key={word}
              style={{
                background: "#181818",
                padding: "40px",
                cursor: "default",
                position: "relative",
                opacity: inView ? 1 : 0,
                transform: inView ? "none" : "translateY(24px)",
                transition: `opacity 600ms ${i * 80 + 160}ms var(--ease-out), transform 600ms ${i * 80 + 160}ms var(--ease-out), background 200ms`,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#1E1E1E")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#181818")}
            >
              <div aria-hidden style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: "rgba(255,255,255,0.07)", pointerEvents: "none" }} />
              <div style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(48px, 5vw, 72px)", color: "#F5F5F5", lineHeight: "1", marginBottom: "12px" }}>{word}</div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: "15px", color: "#A0A0A0", marginBottom: "16px", lineHeight: "1.4" }}>{label}</div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "#525252", lineHeight: "1.5", marginBottom: "24px" }}>{detail}</div>
              {getViz(visual, inView)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
