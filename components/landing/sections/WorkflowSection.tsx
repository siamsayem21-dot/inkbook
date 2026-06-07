"use client";

import { useState } from "react";

const STEPS = [
  {
    n: "01",
    title: "Inquiry arrives",
    desc: "Client submits through your white-label booking page. Captured instantly — no manual follow-up.",
  },
  {
    n: "02",
    title: "AI qualifies the lead",
    desc: "AI collects style, placement, size, budget, and reference images. Delivers a structured brief.",
  },
  {
    n: "03",
    title: "Artist matched",
    desc: "InkBook routes the qualified lead to the best-matched available artist based on style and portfolio.",
  },
  {
    n: "04",
    title: "Quote delivered",
    desc: "Artist reviews the AI brief and sends a professional quote in one click.",
  },
  {
    n: "05",
    title: "Deposit secured",
    desc: "Client pays the mandatory Stripe deposit. Auto-kept on no-shows. No exceptions.",
  },
  {
    n: "06",
    title: "Booking confirmed",
    desc: "Consent form signed. Calendar blocked. SMS reminders scheduled. You show up and tattoo.",
  },
];

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-white/[0.08] bg-white/[0.02] overflow-hidden h-full">
      {children}
    </div>
  );
}

function PanelHeader({ title, status, statusColor = "text-zinc-500" }: { title: string; status: string; statusColor?: string }) {
  return (
    <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.015]">
      <span className="text-[10px] tracking-[0.16em] uppercase text-zinc-600 font-medium">{title}</span>
      <span className={`text-[10px] font-medium ${statusColor}`}>{status}</span>
    </div>
  );
}

function Row({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
      <span className="text-[11px] text-zinc-600">{label}</span>
      <span className={`text-[11px] font-medium ${accent ? "text-emerald-400" : "text-zinc-300"}`}>{value}</span>
    </div>
  );
}

function InquiryPanel() {
  return (
    <Panel>
      <PanelHeader title="New Inquiry" status="Just now" />
      <div className="px-5 py-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border border-white/10 flex items-center justify-center">
              <span className="text-[10px] font-semibold text-zinc-500">JM</span>
            </div>
            <div>
              <div className="text-sm font-medium text-white">Jordan M.</div>
              <div className="text-[11px] text-zinc-600">jordan@email.com · (512) 555-0182</div>
            </div>
          </div>
          <span className="text-[10px] uppercase tracking-[0.1em] font-medium px-2 py-0.5 bg-violet-500/10 border border-violet-500/20 text-violet-400">
            Pending AI
          </span>
        </div>
        <div className="space-y-0">
          <Row label="Style requested" value="Blackwork" />
          <Row label="Placement" value="Full forearm" />
          <Row label="Estimated size" value="10–12 inches" />
          <Row label="Budget range" value="$400–$600" />
          <Row label="Reference images" value="2 uploaded" />
        </div>
        <div className="mt-5 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse-dot" />
          <span className="text-[11px] text-zinc-600">Sending to AI consultation...</span>
        </div>
      </div>
    </Panel>
  );
}

function AIPanel() {
  return (
    <Panel>
      <PanelHeader title="AI Consultation Summary" status="Qualified" statusColor="text-emerald-400" />
      <div className="px-5 py-5">
        <p className="text-[11px] text-zinc-600 mb-5">Jordan M. · Blackwork · Full forearm</p>
        <div className="space-y-0 mb-5">
          {[
            ["Style identified", "Blackwork geometric"],
            ["Placement confirmed", "Full forearm"],
            ["Size estimated", "10–12 in. · 2 sessions"],
            ["Budget qualifies", "$400–600 meets min. rate"],
            ["References reviewed", "2 images · style confirmed"],
          ].map(([label, value]) => (
            <div key={String(label)} className="flex items-start gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-emerald-400 shrink-0 mt-0.5">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div>
                <span className="text-[11px] text-zinc-600">{label}: </span>
                <span className="text-[11px] text-zinc-300 font-medium">{value}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="border border-white/[0.06] bg-white/[0.02] px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">Quality score</p>
            <p className="text-white font-bold text-lg tabular-nums">94 <span className="text-zinc-600 text-sm font-normal">/ 100</span></p>
          </div>
          <span className="text-[11px] text-zinc-500">Routing to artist →</span>
        </div>
      </div>
    </Panel>
  );
}

function MatchPanel() {
  const artists = [
    { initials: "SM", name: "Sarah M.", styles: "Blackwork · Dotwork · Geometric", next: "Tue Feb 12, 2:00 PM", match: 98, routed: true },
    { initials: "JR", name: "Jake R.", styles: "Neo-Traditional · Color", next: "Thu Feb 14, 10:00 AM", match: 72, routed: false },
    { initials: "MC", name: "Mia C.", styles: "Fine Line · Minimal", next: null, match: 61, routed: false },
  ];
  return (
    <Panel>
      <PanelHeader title="Artist Match Results" status="Blackwork · Full forearm" />
      <div className="divide-y divide-white/[0.04]">
        {artists.map((a) => (
          <div
            key={a.name}
            className={`flex items-start gap-3.5 px-5 py-4 ${a.routed ? "bg-white/[0.025]" : ""}`}
          >
            <div className={`w-8 h-8 flex items-center justify-center shrink-0 border ${a.routed ? "border-white/30 bg-white/10" : "border-white/[0.08]"}`}>
              <span className="text-[10px] font-semibold text-zinc-400">{a.initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-medium text-white">{a.name}</span>
                {a.routed && (
                  <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
                    Routed
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-600 mb-0.5">{a.styles}</p>
              <p className="text-[11px] text-zinc-600">
                {a.next ? `Next: ${a.next}` : "Fully booked · Waitlist open"}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-sm font-bold tabular-nums ${a.match >= 90 ? "text-emerald-400" : a.match >= 70 ? "text-violet-400" : "text-zinc-600"}`}>
                {a.match}%
              </p>
              <p className="text-[9px] text-zinc-700 uppercase tracking-wider">match</p>
            </div>
          </div>
        ))}
      </div>
      <div className="px-5 py-3 border-t border-white/[0.04] bg-white/[0.01]">
        <p className="text-[11px] text-zinc-600">Notification sent to Sarah M.</p>
      </div>
    </Panel>
  );
}

function QuotePanel() {
  return (
    <Panel>
      <PanelHeader title="Quote #Q-2847" status="Sent" statusColor="text-violet-400" />
      <div className="px-5 py-5">
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/[0.05]">
          <div>
            <p className="text-sm font-medium text-white">Jordan M. → Sarah M.</p>
            <p className="text-[11px] text-zinc-600">Blackwork Full Sleeve · 2 sessions</p>
          </div>
          <span className="text-[11px] text-zinc-600">Jan 15, 2026</span>
        </div>
        <div className="space-y-0 mb-5">
          <Row label="Session 1 (4hr @ $175/hr)" value="$700.00" />
          <Row label="Session 2 (4hr @ $175/hr)" value="$700.00" />
        </div>
        <div className="border border-white/[0.06] bg-white/[0.02] px-4 py-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-[11px] text-zinc-600">Total</span>
            <span className="text-sm font-semibold text-white tabular-nums">$1,400.00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[11px] text-zinc-600">Deposit required (20%)</span>
            <span className="text-sm font-semibold text-violet-400 tabular-nums">$280.00</span>
          </div>
        </div>
        <p className="text-[11px] text-zinc-700 mt-4">Sent Jan 15, 9:42 AM · Client notified via email + SMS</p>
      </div>
    </Panel>
  );
}

function DepositPanel() {
  return (
    <Panel>
      <PanelHeader title="Payment Received" status="✓ Collected" statusColor="text-emerald-400" />
      <div className="px-5 py-5">
        <div className="text-center py-5 border-b border-white/[0.05] mb-5">
          <p className="text-[10px] tracking-[0.14em] uppercase text-zinc-600 mb-2">Amount collected</p>
          <p className="text-4xl font-bold text-white tabular-nums mb-1">$280.00</p>
          <p className="text-[11px] text-zinc-600">Blackwork Sleeve — Deposit</p>
        </div>
        <div className="space-y-0 mb-5">
          <Row label="Client" value="Jordan M." />
          <Row label="Artist" value="Sarah M." />
          <Row label="Collected" value="Jan 15 · 2:47 PM" />
          <Row label="Method" value="Visa ···· 4242 via Stripe" />
          <Row label="Status" value="Non-refundable" accent />
        </div>
        <div className="border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5">
          <p className="text-[11px] text-emerald-500">Auto-kept if client no-shows · Cannot be disabled by artist or studio</p>
        </div>
      </div>
    </Panel>
  );
}

function ConfirmedPanel() {
  return (
    <Panel>
      <PanelHeader title="Booking Confirmed" status="✓ All set" statusColor="text-emerald-400" />
      <div className="px-5 py-5">
        <div className="mb-5 pb-4 border-b border-white/[0.05]">
          <p className="text-sm font-medium text-white mb-0.5">Jordan M. with Sarah M.</p>
          <p className="text-[11px] text-zinc-600">Blackwork Full Sleeve · Session 1 of 2</p>
        </div>
        <div className="space-y-0">
          <Row label="Date" value="Tue, Feb 12, 2026" />
          <Row label="Time" value="2:00 PM – 6:00 PM (4hr)" />
          <Row label="Deposit" value="$280.00 ✓ Collected" accent />
          <Row label="Consent form" value="✓ Signed digitally" accent />
          <Row label="SMS reminders" value="✓ 48hr + day-of set" accent />
          <Row label="Calendar" value="✓ Blocked for artist" accent />
        </div>
        <div className="mt-5 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <p className="text-[11px] text-zinc-600">Artist notified · Client confirmation sent · Studio calendar updated</p>
        </div>
      </div>
    </Panel>
  );
}

const PANELS = [InquiryPanel, AIPanel, MatchPanel, QuotePanel, DepositPanel, ConfirmedPanel];

export default function WorkflowSection() {
  const [active, setActive] = useState(0);
  const ActivePanel = PANELS[active];

  return (
    <section className="px-6 py-24 md:py-32 border-t border-white/[0.06]">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-14 md:mb-16">
          <p className="text-[11px] tracking-[0.18em] uppercase text-zinc-600 font-medium mb-4">
            How it works
          </p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight text-white mb-5 max-w-2xl">
            Inquiry to confirmed booking.
            <br />
            <span className="text-zinc-500">Fully automated.</span>
          </h2>
          <p className="text-zinc-500 text-base max-w-lg leading-relaxed">
            Six steps. Zero manual work. You focus on the art — InkBook handles everything else.
          </p>
        </div>

        {/* Desktop: sidebar + panel */}
        <div className="hidden lg:grid grid-cols-[280px_1fr] gap-8 items-start">
          {/* Step list */}
          <div className="border border-white/[0.08] bg-white/[0.02] overflow-hidden">
            {STEPS.map((step, i) => (
              <button
                key={step.n}
                onClick={() => setActive(i)}
                className={`w-full text-left px-5 py-4 border-l-2 border-b border-b-white/[0.04] last:border-b-0 transition-all group ${
                  active === i
                    ? "border-l-white bg-white/[0.04]"
                    : "border-l-transparent hover:border-l-white/20 hover:bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center gap-3 mb-1">
                  <span className={`text-[11px] tabular-nums font-medium shrink-0 transition-colors ${active === i ? "text-zinc-400" : "text-zinc-700"}`}>
                    {step.n}
                  </span>
                  <span className={`text-[13px] font-medium transition-colors ${active === i ? "text-white" : "text-zinc-500 group-hover:text-zinc-300"}`}>
                    {step.title}
                  </span>
                </div>
                {active === i && (
                  <p className="text-[11px] text-zinc-600 leading-relaxed pl-6">{step.desc}</p>
                )}
              </button>
            ))}
          </div>

          {/* Product panel */}
          <div className="min-h-[380px]">
            <ActivePanel />
          </div>
        </div>

        {/* Mobile: accordion */}
        <div className="lg:hidden space-y-2">
          {STEPS.map((step, i) => {
            const StepPanel = PANELS[i];
            const isOpen = active === i;
            return (
              <div key={step.n} className="border border-white/[0.08] bg-white/[0.02] overflow-hidden">
                <button
                  onClick={() => setActive(isOpen ? -1 : i)}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left"
                >
                  <span className="text-[11px] text-zinc-700 tabular-nums shrink-0">{step.n}</span>
                  <span className={`text-[13px] font-medium flex-1 ${isOpen ? "text-white" : "text-zinc-500"}`}>
                    {step.title}
                  </span>
                  <svg
                    width="12" height="12" viewBox="0 0 12 12" fill="none"
                    className={`text-zinc-600 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`}
                  >
                    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5">
                    <p className="text-[11px] text-zinc-600 mb-4">{step.desc}</p>
                    <StepPanel />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
