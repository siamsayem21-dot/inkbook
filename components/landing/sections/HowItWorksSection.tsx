"use client";

import { useState } from "react";

const steps = [
  {
    n: "01",
    title: "Inquiry arrives",
    desc: "Client submits a request through your white-label booking page or link. Captured instantly — no manual follow-up.",
  },
  {
    n: "02",
    title: "AI qualifies the lead",
    desc: "AI collects style, placement, size, budget, and reference images. Delivers a structured brief — not a messy DM thread.",
  },
  {
    n: "03",
    title: "Artist matched",
    desc: "InkBook routes the qualified lead to the best-matched available artist based on style, portfolio, and schedule.",
  },
  {
    n: "04",
    title: "Quote delivered",
    desc: "Artist reviews the AI summary and sends a professional quote in one click. No negotiating. No guesswork.",
  },
  {
    n: "05",
    title: "Deposit secured",
    desc: "Client pays the mandatory Stripe deposit. Auto-kept on no-shows. Booking is held until payment clears.",
  },
  {
    n: "06",
    title: "Booking confirmed",
    desc: "Consent form signed digitally. Calendar blocked. SMS reminders scheduled. You show up and tattoo.",
  },
];

function InquiryUI() {
  return (
    <div className="bg-white border border-[#E5E7EB] overflow-hidden h-full" style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.06)" }}>
      <div className="bg-[#F8FAFC] border-b border-[#E5E7EB] px-4 py-2.5 flex items-center justify-between">
        <span className="text-[10px] text-[#94A3B8] uppercase tracking-widest">New inquiry</span>
        <span className="text-[10px] text-[#94A3B8]">Just now</span>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-[#0F172A] font-semibold mb-0.5">Jordan M.</p>
            <p className="text-[#64748B] text-xs">jordan@email.com · (512) 555-0182</p>
          </div>
          <span className="text-[9px] uppercase tracking-widest bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-1 font-medium">
            Pending AI
          </span>
        </div>
        <div className="space-y-0">
          {[
            ["Style requested", "Blackwork"],
            ["Placement", "Full forearm"],
            ["Estimated size", "10–12 inches"],
            ["Budget range", "$400 – $600"],
            ["Reference images", "2 uploaded"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between py-2.5 border-b border-[#F3F4F6] last:border-0">
              <span className="text-[#64748B] text-xs">{label}</span>
              <span className="text-[#0F172A] text-xs font-medium">{value}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-[10px] text-[#94A3B8]">Sending to AI consultation...</span>
        </div>
      </div>
    </div>
  );
}

function AIQualifyUI() {
  return (
    <div className="bg-white border border-[#E5E7EB] overflow-hidden h-full" style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.06)" }}>
      <div className="bg-[#F8FAFC] border-b border-[#E5E7EB] px-4 py-2.5 flex items-center justify-between">
        <span className="text-[10px] text-[#94A3B8] uppercase tracking-widest">AI consultation summary</span>
        <span className="text-[10px] text-green-600 font-medium">Qualified</span>
      </div>
      <div className="p-5">
        <p className="text-[#64748B] text-xs mb-4">Jordan M. · Blackwork · Full forearm</p>
        <div className="space-y-0 mb-5">
          {[
            ["Style identified", "Blackwork geometric", true],
            ["Placement confirmed", "Full forearm", true],
            ["Size estimated", "10–12 inches · 2 sessions", true],
            ["Budget qualifies", "$400–600 meets minimum rate", true],
            ["References reviewed", "2 images · style match confirmed", true],
          ].map(([label, value, ok]) => (
            <div key={String(label)} className="flex items-start gap-3 py-2 border-b border-[#F3F4F6] last:border-0">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`shrink-0 mt-0.5 ${ok ? "text-green-600" : "text-red-500"}`}>
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div>
                <span className="text-[#64748B] text-xs">{label}: </span>
                <span className="text-[#0F172A] text-xs font-medium">{value}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-[#F8FAFC] border border-[#E5E7EB] px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest mb-1">Quality score</p>
            <p className="text-[#0F172A] font-bold text-lg tabular-nums">94 <span className="text-[#94A3B8] text-sm font-normal">/ 100</span></p>
          </div>
          <span className="text-[10px] text-[#64748B]">Routing to artist match →</span>
        </div>
      </div>
    </div>
  );
}

function ArtistMatchUI() {
  const artists = [
    { initials: "SM", name: "Sarah M.", styles: "Blackwork · Dotwork · Geometric", next: "Tue Feb 12, 2:00 PM", match: 98, routed: true },
    { initials: "JR", name: "Jake R.", styles: "Neo-Traditional · Color", next: "Thu Feb 14, 10:00 AM", match: 72, routed: false },
    { initials: "MC", name: "Mia C.", styles: "Fine Line · Minimal", next: null, match: 61, routed: false },
  ];
  return (
    <div className="bg-white border border-[#E5E7EB] overflow-hidden h-full" style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.06)" }}>
      <div className="bg-[#F8FAFC] border-b border-[#E5E7EB] px-4 py-2.5 flex items-center justify-between">
        <span className="text-[10px] text-[#94A3B8] uppercase tracking-widest">Artist match results</span>
        <span className="text-[10px] text-[#94A3B8]">Blackwork · Full forearm</span>
      </div>
      <div className="divide-y divide-[#F3F4F6]">
        {artists.map((a) => (
          <div key={a.name} className={`flex items-start gap-3.5 px-4 py-4 ${a.routed ? "bg-[#F8FAFC]" : ""}`}>
            <div className={`w-8 h-8 flex items-center justify-center shrink-0 border ${
              a.routed ? "bg-[#0F172A] border-[#0F172A]" : "bg-[#F3F4F6] border-[#E5E7EB]"
            }`}>
              <span className={`text-[9px] font-bold ${a.routed ? "text-white" : "text-[#64748B]"}`}>{a.initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm text-[#0F172A] font-semibold">{a.name}</span>
                {a.routed && (
                  <span className="text-[9px] uppercase tracking-widest bg-green-50 border border-green-200 text-green-700 px-2 py-0.5 font-medium">Routed</span>
                )}
              </div>
              <p className="text-[10px] text-[#94A3B8] mb-1">{a.styles}</p>
              <p className="text-[10px] text-[#64748B]">
                {a.next ? `Next: ${a.next}` : "Fully booked · Waitlist open"}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-sm font-bold tabular-nums ${
                a.match >= 90 ? "text-green-600" : a.match >= 70 ? "text-blue-600" : "text-[#94A3B8]"
              }`}>{a.match}%</p>
              <p className="text-[9px] text-[#94A3B8] uppercase tracking-widest">match</p>
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 bg-[#F8FAFC] border-t border-[#E5E7EB]">
        <p className="text-[10px] text-[#64748B]">Notification sent to Sarah M.</p>
      </div>
    </div>
  );
}

function QuoteUI() {
  return (
    <div className="bg-white border border-[#E5E7EB] overflow-hidden h-full" style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.06)" }}>
      <div className="bg-[#F8FAFC] border-b border-[#E5E7EB] px-4 py-2.5 flex items-center justify-between">
        <span className="text-[10px] text-[#94A3B8] uppercase tracking-widest">Quote #Q-2847</span>
        <span className="text-[10px] bg-purple-50 border border-purple-200 text-purple-700 px-2 py-0.5 uppercase tracking-widest font-medium">Awaiting</span>
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-[#F3F4F6]">
          <div>
            <p className="text-[#0F172A] font-semibold">Jordan M. → Sarah M.</p>
            <p className="text-[#64748B] text-xs">Blackwork Full Sleeve · 2 sessions</p>
          </div>
          <span className="text-xs text-[#94A3B8]">Jan 15, 2026</span>
        </div>
        <div className="space-y-0 mb-5">
          {[
            ["Session 1 (4hr @ $175/hr)", "$700.00"],
            ["Session 2 (4hr @ $175/hr)", "$700.00"],
          ].map(([label, val]) => (
            <div key={label} className="flex items-center justify-between py-2.5 border-b border-[#F3F4F6] last:border-0">
              <span className="text-[#64748B] text-xs">{label}</span>
              <span className="text-[#0F172A] text-xs font-semibold tabular-nums">{val}</span>
            </div>
          ))}
        </div>
        <div className="bg-[#F8FAFC] border border-[#E5E7EB] p-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-[#64748B] text-xs">Total</span>
            <span className="text-[#0F172A] text-sm font-bold tabular-nums">$1,400.00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#64748B] text-xs">Deposit required (20%)</span>
            <span className="text-blue-600 text-sm font-bold tabular-nums">$280.00</span>
          </div>
        </div>
        <p className="text-[10px] text-[#94A3B8] mt-4">Sent Jan 15, 9:42 AM · Client notified via email + SMS</p>
      </div>
    </div>
  );
}

function DepositUI() {
  return (
    <div className="bg-white border border-[#E5E7EB] overflow-hidden h-full" style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.06)" }}>
      <div className="bg-[#F8FAFC] border-b border-[#E5E7EB] px-4 py-2.5 flex items-center justify-between">
        <span className="text-[10px] text-[#94A3B8] uppercase tracking-widest">Payment received</span>
        <span className="text-[10px] bg-green-50 border border-green-200 text-green-700 px-2 py-0.5 uppercase tracking-widest font-medium">Collected</span>
      </div>
      <div className="p-5">
        <div className="text-center py-6 border-b border-[#F3F4F6] mb-5">
          <p className="text-[#94A3B8] text-xs mb-2 uppercase tracking-widest">Amount collected</p>
          <p className="text-[#0F172A] text-4xl font-bold tabular-nums mb-1">$280.00</p>
          <p className="text-[#64748B] text-xs">Blackwork Sleeve — Deposit</p>
        </div>
        <div className="space-y-0">
          {[
            ["Client", "Jordan M."],
            ["Artist", "Sarah M."],
            ["Collected", "Jan 15, 2026 · 2:47 PM"],
            ["Method", "Visa ···· 4242 via Stripe"],
            ["Status", "Non-refundable"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between py-2.5 border-b border-[#F3F4F6] last:border-0">
              <span className="text-[#64748B] text-xs">{label}</span>
              <span className={`text-xs font-medium ${label === "Status" ? "text-green-600" : "text-[#0F172A]"}`}>{value}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 bg-green-50 border border-green-100 px-3 py-2">
          <p className="text-[10px] text-green-700">Auto-kept if client no-shows · Cannot be disabled by artist or studio</p>
        </div>
      </div>
    </div>
  );
}

function ConfirmedUI() {
  return (
    <div className="bg-white border border-[#E5E7EB] overflow-hidden h-full" style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.06)" }}>
      <div className="bg-[#F8FAFC] border-b border-[#E5E7EB] px-4 py-2.5 flex items-center justify-between">
        <span className="text-[10px] text-[#94A3B8] uppercase tracking-widest">Booking confirmed</span>
        <span className="text-[10px] bg-green-50 border border-green-200 text-green-700 px-2 py-0.5 uppercase tracking-widest font-medium">✓ Confirmed</span>
      </div>
      <div className="p-5">
        <div className="mb-5 pb-4 border-b border-[#F3F4F6]">
          <p className="text-[#0F172A] font-semibold mb-0.5">Jordan M. with Sarah M.</p>
          <p className="text-[#64748B] text-xs">Blackwork Full Sleeve · Session 1 of 2</p>
        </div>
        <div className="space-y-0 mb-5">
          {[
            ["Date", "Tue, Feb 12, 2026"],
            ["Time", "2:00 PM – 6:00 PM (4hr)"],
            ["Deposit", "$280.00 ✓ Collected"],
            ["Consent form", "✓ Signed digitally"],
            ["SMS reminders", "✓ 48hr + day-of scheduled"],
            ["Calendar", "✓ Blocked for artist"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-start justify-between py-2.5 border-b border-[#F3F4F6] last:border-0">
              <span className="text-[#64748B] text-xs">{label}</span>
              <span className={`text-xs font-medium text-right max-w-[160px] ${
                String(value).includes("✓") ? "text-green-600" : "text-[#0F172A]"
              }`}>{value}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <p className="text-[10px] text-[#94A3B8]">Artist notified · Studio calendar updated · Client confirmation sent</p>
        </div>
      </div>
    </div>
  );
}

const stepUIs = [InquiryUI, AIQualifyUI, ArtistMatchUI, QuoteUI, DepositUI, ConfirmedUI];

export default function HowItWorksSection() {
  const [active, setActive] = useState(0);
  const ActiveUI = stepUIs[active];

  return (
    <section id="how-it-works" className="px-6 py-24 bg-[#F8FAFC] border-t border-[#E5E7EB]">
      <div className="max-w-6xl mx-auto">

        <div className="mb-14">
          <p className="label-xs text-[#64748B] mb-4">End-to-end automation</p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-[-0.02em] mb-4 text-[#0F172A]">
            From inquiry to confirmed booking.
          </h2>
          <p className="text-[#64748B] text-base max-w-md">
            Six steps. Fully automated. You focus on the art — InkBook handles everything else.
          </p>
        </div>

        {/* Desktop: sidebar + product panel */}
        <div className="hidden lg:grid grid-cols-[300px_1fr] gap-8">
          {/* Step list */}
          <div className="bg-white border border-[#E5E7EB]" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            {steps.map((step, i) => (
              <button
                key={step.n}
                onClick={() => setActive(i)}
                className={`w-full text-left px-4 py-4 border-l-[3px] border-b border-b-[#F3F4F6] last:border-b-0 transition-all group ${
                  active === i
                    ? "border-l-[#0F172A] bg-white"
                    : "border-l-transparent hover:border-l-[#CBD5E1] hover:bg-[#F8FAFC]"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-xs tabular-nums transition-colors shrink-0 ${active === i ? "text-[#0F172A] font-bold" : "text-[#CBD5E1] group-hover:text-[#94A3B8]"}`}>
                      {step.n}
                    </span>
                    <span className={`text-sm transition-colors ${active === i ? "text-[#0F172A] font-semibold" : "font-medium text-[#64748B] group-hover:text-[#0F172A]"}`}>
                      {step.title}
                    </span>
                  </div>
                  <svg
                    width="12" height="12" viewBox="0 0 12 12" fill="none"
                    className={`shrink-0 transition-all duration-150 ${
                      active === i
                        ? "text-[#94A3B8] opacity-60"
                        : "text-[#CBD5E1] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5"
                    }`}
                  >
                    <path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                {active === i && (
                  <p className="text-xs text-[#94A3B8] leading-relaxed pl-7">{step.desc}</p>
                )}
              </button>
            ))}
            <p className="px-4 pt-3 pb-3 text-[10px] text-[#CBD5E1]">
              Click any step to explore the workflow
            </p>
          </div>

          {/* Product UI panel */}
          <div className="min-h-[420px]" style={{ filter: "drop-shadow(0 20px 56px rgba(0,0,0,0.10)) drop-shadow(0 4px 16px rgba(0,0,0,0.08))" }}>
            <ActiveUI />
          </div>
        </div>

        {/* Mobile: vertical accordion */}
        <div className="lg:hidden space-y-2">
          {steps.map((step, i) => {
            const StepUI = stepUIs[i];
            return (
              <div key={step.n} className="bg-white border border-[#E5E7EB]">
                <button
                  onClick={() => setActive(active === i ? -1 : i)}
                  className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-[#F8FAFC] transition-colors"
                >
                  <span className="text-[#CBD5E1] text-xs tabular-nums">{step.n}</span>
                  <span className={`text-sm font-medium flex-1 ${active === i ? "text-[#0F172A]" : "text-[#64748B]"}`}>
                    {step.title}
                  </span>
                  <svg
                    width="12" height="12" viewBox="0 0 12 12" fill="none"
                    className={`text-[#94A3B8] transition-transform ${active === i ? "rotate-180" : ""}`}
                  >
                    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {active === i && (
                  <div className="px-4 pb-4">
                    <p className="text-xs text-[#94A3B8] mb-4">{step.desc}</p>
                    <StepUI />
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
