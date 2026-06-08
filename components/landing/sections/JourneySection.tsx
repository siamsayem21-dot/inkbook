"use client";

import React, { useState } from "react";

const STEPS = [
  { n: "01", id: "inquiry",  label: "Inquiry",          next: "AI Consultation", desc: "Every client request captured through your white-label booking page — studio-branded, mobile-optimized, always on." },
  { n: "02", id: "ai",       label: "AI Consultation",  next: "Style Detection",  desc: "InkBook AI qualifies every lead end-to-end. Style, placement, size, budget — collected and structured before you see it." },
  { n: "03", id: "style",    label: "Style Detection",  next: "Artist Matching",  desc: "Reference images are analyzed automatically. Style tags applied. Artists pre-filtered before routing begins." },
  { n: "04", id: "matching", label: "Artist Matching",  next: "Quote",            desc: "Leads routed to the highest-matched available artist based on style, portfolio, and real-time schedule." },
  { n: "05", id: "quote",    label: "Quote",            next: "Deposit",          desc: "Artists review the AI lead brief and send a professional quote in one click. No negotiating. No back-and-forth." },
  { n: "06", id: "deposit",  label: "Deposit",          next: "Consent",          desc: "Mandatory Stripe deposit collected before the booking is held. Auto-kept on no-shows. Cannot be disabled." },
  { n: "07", id: "consent",  label: "Consent",          next: "Booking",          desc: "State-specific digital consent form signed before arrival. Minor age verification included. Stored permanently." },
  { n: "08", id: "booking",  label: "Booking",          next: "CRM",              desc: "Calendar blocked. SMS reminders scheduled. Artist notified. Client confirmed. Everything runs automatically." },
  { n: "09", id: "crm",      label: "CRM",              next: "Aftercare",        desc: "Every client's full history, style preferences, session notes, and risk profile — in one permanent record." },
  { n: "10", id: "aftercare",label: "Aftercare",        next: "Reviews",          desc: "Aftercare instructions sent automatically. Day 3, Day 7, Day 14 follow-ups scheduled without any artist action." },
  { n: "11", id: "reviews",  label: "Reviews",          next: null,               desc: "Review request sent on Day 14. Response tracked. Five-star reviews published to Google and your studio profile." },
];

function ModuleBar({ title, status, statusColor = "text-green-400" }: { title: string; status: string; statusColor?: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-[#111827] border-b border-white/[0.08] shrink-0">
      <span className="text-[10px] text-white/30 font-mono uppercase tracking-[0.12em]">{title}</span>
      <span className={`text-[10px] uppercase tracking-[0.14em] font-medium font-mono ${statusColor}`}>{status}</span>
    </div>
  );
}

function FeedsInto({ next }: { next: string }) {
  return (
    <div className="shrink-0 flex items-center gap-3 px-4 py-2 border-t border-white/[0.06] bg-[#0A1020]">
      <div className="flex-1 h-px bg-white/[0.05]" />
      <span className="text-[9px] text-white/20 font-mono uppercase tracking-[0.12em]">routes to</span>
      <span className="text-[9px] text-white/45 font-mono uppercase tracking-[0.12em]">{next}</span>
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
        <path d="M1.5 4h5M4 1.5l2.5 2.5L4 6.5" stroke="rgba(255,255,255,0.25)" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

function InquiryUI({ next }: { next: string | null }) {
  return (
    <div className="bg-[#0F172A] h-full flex flex-col">
      <ModuleBar title="Client Intake · ink-and-iron.inkbook.co" status="Live" />
      <div className="flex-1 bg-white overflow-auto">
        <div className="border-b border-[#E5E7EB] px-5 py-4 flex items-center gap-2.5">
          <div className="w-6 h-6 bg-[#0F172A] border border-[#0F172A] flex items-center justify-center shrink-0">
            <span className="text-[8px] text-white font-bold" style={{ fontFamily: "Georgia, serif" }}>IB</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#0F172A]">Ink & Iron Studio</p>
            <p className="text-[9px] text-[#94A3B8]">Phoenix, AZ · Accepting new clients</p>
          </div>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest mb-4">New appointment request</p>
          {[
            { label: "Full name", placeholder: "Jordan Martinez" },
            { label: "Email", placeholder: "jordan@email.com" },
            { label: "Phone", placeholder: "(512) 555-0182" },
          ].map((f) => (
            <div key={f.label}>
              <p className="text-[10px] text-[#374151] font-medium mb-1">{f.label}</p>
              <div className="border border-[#E5E7EB] px-3 py-2 text-xs text-[#94A3B8] bg-[#F9FAFB]">{f.placeholder}</div>
            </div>
          ))}
          <div>
            <p className="text-[10px] text-[#374151] font-medium mb-1">Style requested</p>
            <div className="border border-[#E5E7EB] px-3 py-2 text-xs text-[#0F172A] flex justify-between items-center">
              <span>Blackwork</span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 4l3 3 3-3" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round"/></svg>
            </div>
          </div>
          <div className="border border-dashed border-[#CBD5E1] px-4 py-4 text-center bg-[#F8FAFC]">
            <p className="text-[10px] text-[#94A3B8]">Reference images · Drop or click to upload</p>
          </div>
          <button className="w-full bg-[#0F172A] text-white text-xs font-semibold py-3 mt-2">Request Appointment</button>
          <p className="text-[9px] text-[#CBD5E1] text-center">Secured by InkBook · No account required</p>
        </div>
      </div>
      {next && <FeedsInto next={next} />}
    </div>
  );
}

function AIConsultUI({ next }: { next: string | null }) {
  const msgs = [
    { role: "ai", text: "Hi Jordan! I'd love to help you book with Ink & Iron. What style are you thinking?" },
    { role: "client", text: "I want a blackwork wolf on my forearm. Geometric style." },
    { role: "ai", text: "Great choice — Blackwork geometric is one of our most requested styles. Can you share a reference image, and what size were you thinking?" },
    { role: "client", text: "About 6 inches. Budget is $400–600." },
  ];
  return (
    <div className="bg-[#0F172A] h-full flex flex-col">
      <ModuleBar title="AI Consultation · Module 02" status="Qualifying" statusColor="text-blue-400" />
      <div className="flex-1 bg-[#F8FAFC] overflow-auto p-4 space-y-3">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === "client" ? "justify-end" : "gap-2 items-start"}`}>
            {m.role === "ai" && (
              <div className="w-5 h-5 bg-[#0F172A] flex items-center justify-center shrink-0 mt-0.5">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M8 14v2M12 14v4M16 14v2M12 8V4H8"/></svg>
              </div>
            )}
            <div className={`max-w-[80%] px-3 py-2 text-xs leading-relaxed ${m.role === "client" ? "bg-[#0F172A] text-white" : "bg-white border border-[#E5E7EB] text-[#374151]"}`}>
              {m.text}
            </div>
          </div>
        ))}
        <div className="bg-white border border-[#E5E7EB] px-4 py-3 mt-2">
          <div className="flex justify-between items-center mb-2">
            <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest">AI Lead Summary</p>
            <span className="text-[10px] font-bold text-green-600">94 / 100</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {["Blackwork", "Geometric", "Forearm", '6"', "$400–600", "✓ Qualified"].map((t, i) => (
              <span key={t} className={`text-[9px] border px-1.5 py-0.5 font-medium ${i === 5 ? "bg-green-50 border-green-200 text-green-700" : "bg-[#F8FAFC] border-[#E5E7EB] text-[#64748B]"}`}>{t}</span>
            ))}
          </div>
          <p className="text-[9px] text-[#94A3B8] mt-2">Routing to artist match →</p>
        </div>
      </div>
      {next && <FeedsInto next={next} />}
    </div>
  );
}

function StyleUI({ next }: { next: string | null }) {
  const styles = [
    { name: "Blackwork", pct: 94, color: "bg-[#0F172A]" },
    { name: "Geometric", pct: 81, color: "bg-[#374151]" },
    { name: "Dotwork",   pct: 63, color: "bg-[#94A3B8]" },
  ];
  return (
    <div className="bg-[#0F172A] h-full flex flex-col">
      <ModuleBar title="Style Detection · Module 03" status="Complete" />
      <div className="flex-1 bg-white overflow-auto">
        <div className="grid grid-cols-2 h-full divide-x divide-[#E5E7EB]">
          <div className="p-4">
            <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest mb-3">Reference image</p>
            <div className="bg-[#F3F4F6] border border-[#E5E7EB] h-28 flex items-center justify-center mb-3">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
            </div>
            <p className="text-[10px] text-[#64748B]">wolf-reference.jpg</p>
            <p className="text-[9px] text-[#94A3B8] mt-0.5">Uploaded · 2 images analyzed</p>
          </div>
          <div className="p-4">
            <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest mb-3">Detected styles</p>
            <div className="space-y-4">
              {styles.map((s) => (
                <div key={s.name}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-medium text-[#374151]">{s.name}</span>
                    <span className="text-xs font-bold text-[#0F172A] tabular-nums">{s.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-[#F3F4F6] overflow-hidden">
                    <div className={`h-full ${s.color}`} style={{ width: `${s.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-[#F3F4F6]">
              <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest mb-1.5">Artist filter applied</p>
              <p className="text-xs text-[#374151]">Blackwork specialists only</p>
              <p className="text-[10px] text-green-600 mt-0.5">2 artists available</p>
            </div>
          </div>
        </div>
      </div>
      {next && <FeedsInto next={next} />}
    </div>
  );
}

function MatchingUI({ next }: { next: string | null }) {
  const artists = [
    { initials: "SM", name: "Sarah M.", styles: "Blackwork · Dotwork · Geometric", match: 98, util: 90, next: "Tue 2:00 PM", routed: true },
    { initials: "JR", name: "Jake R.",  styles: "Neo-Trad · Color · Illustrative", match: 34, util: 68, next: "Thu 10:00 AM", routed: false },
  ];
  return (
    <div className="bg-[#0F172A] h-full flex flex-col">
      <ModuleBar title="Artist Matching · Module 04" status="Routed" />
      <div className="flex-1 bg-white overflow-auto">
        <div className="px-4 py-3 border-b border-[#F3F4F6]">
          <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest">Match results · Blackwork forearm</p>
        </div>
        <div className="divide-y divide-[#F3F4F6]">
          {artists.map((a) => (
            <div key={a.name} className={`p-4 ${a.routed ? "bg-[#F8FAFC]" : ""}`}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 flex items-center justify-center border shrink-0 ${a.routed ? "bg-[#0F172A] border-[#0F172A]" : "bg-[#F3F4F6] border-[#E5E7EB]"}`}>
                  <span className={`text-[9px] font-bold ${a.routed ? "text-white" : "text-[#64748B]"}`}>{a.initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-[#0F172A]">{a.name}</span>
                    {a.routed && <span className="text-[9px] bg-green-50 border border-green-200 text-green-700 px-2 py-0.5 uppercase tracking-widest font-medium">Routed</span>}
                  </div>
                  <p className="text-[10px] text-[#94A3B8] mb-2">{a.styles}</p>
                  <div className="h-1 bg-[#F3F4F6] overflow-hidden">
                    <div className={`h-full ${a.util >= 90 ? "bg-orange-400" : "bg-[#0F172A]"}`} style={{ width: `${a.util}%` }} />
                  </div>
                  <p className="text-[9px] text-[#94A3B8] mt-1">Next: {a.next} · {a.util}% booked</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-lg font-bold tabular-nums ${a.match >= 80 ? "text-green-600" : "text-[#94A3B8]"}`}>{a.match}%</p>
                  <p className="text-[9px] text-[#94A3B8] uppercase tracking-widest">match</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 bg-[#F8FAFC] border-t border-[#E5E7EB] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
          <p className="text-[10px] text-[#64748B]">Notification sent to Sarah M. · Lead brief delivered</p>
        </div>
      </div>
      {next && <FeedsInto next={next} />}
    </div>
  );
}

function QuoteUI({ next }: { next: string | null }) {
  return (
    <div className="bg-[#0F172A] h-full flex flex-col">
      <ModuleBar title="Quote #Q-2847 · Module 05" status="Sent" statusColor="text-purple-400" />
      <div className="flex-1 bg-white overflow-auto p-5">
        <div className="flex items-start justify-between mb-4 pb-4 border-b border-[#F3F4F6]">
          <div>
            <p className="text-sm font-semibold text-[#0F172A]">Jordan M. → Sarah M.</p>
            <p className="text-[10px] text-[#64748B]">Blackwork Geometric Sleeve · 2 sessions</p>
          </div>
          <span className="text-[9px] text-[#94A3B8]">Jan 15, 2026</span>
        </div>
        {[["Session 1 — Blackwork base (4hr @ $175/hr)", "$700.00"], ["Session 2 — Detail & shading (4hr @ $175/hr)", "$700.00"]].map(([l, v]) => (
          <div key={l} className="flex justify-between py-2.5 border-b border-[#F3F4F6]">
            <span className="text-xs text-[#64748B]">{l}</span>
            <span className="text-xs font-semibold text-[#0F172A] tabular-nums">{v}</span>
          </div>
        ))}
        <div className="bg-[#F8FAFC] border border-[#E5E7EB] p-4 mt-4 space-y-2">
          {[["Total", "$1,400.00", "text-[#0F172A]"], ["Deposit required (20%)", "$280.00", "text-blue-600"], ["Balance at session", "$1,120.00", "text-[#94A3B8]"]].map(([l, v, c]) => (
            <div key={l} className="flex justify-between">
              <span className="text-xs text-[#64748B]">{l}</span>
              <span className={`text-xs font-bold tabular-nums ${c}`}>{v}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[#94A3B8] mt-3">Sent Jan 15 · 9:42 AM · Client notified via email + SMS</p>
        <div className="mt-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
          <p className="text-[10px] text-blue-600">Viewed by client · 2 min ago</p>
        </div>
      </div>
      {next && <FeedsInto next={next} />}
    </div>
  );
}

function DepositUI({ next }: { next: string | null }) {
  return (
    <div className="bg-[#0F172A] h-full flex flex-col">
      <ModuleBar title="Deposit · Module 06" status="Collected" />
      <div className="flex-1 bg-white overflow-auto">
        <div className="text-center py-8 border-b border-[#F3F4F6]">
          <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest mb-3">Amount collected</p>
          <p className="text-[#0F172A] text-5xl font-bold tabular-nums mb-2">$280</p>
          <p className="text-[#64748B] text-sm">Blackwork Sleeve — Deposit</p>
        </div>
        <div className="p-5 space-y-0">
          {[["From", "Jordan M."], ["To artist", "Sarah M."], ["Collected", "Jan 15 · 2:47 PM"], ["Via", "Stripe · Visa ···· 4242"], ["Status", "Non-refundable"]].map(([l, v]) => (
            <div key={l} className="flex justify-between py-2.5 border-b border-[#F3F4F6] last:border-0">
              <span className="text-xs text-[#64748B]">{l}</span>
              <span className={`text-xs font-medium ${l === "Status" ? "text-green-600" : "text-[#0F172A]"}`}>{v}</span>
            </div>
          ))}
        </div>
        <div className="mx-5 mb-5 bg-green-50 border border-green-100 px-4 py-3">
          <p className="text-[10px] text-green-700">Auto-kept if client no-shows · Cannot be disabled by artist or studio</p>
        </div>
      </div>
      {next && <FeedsInto next={next} />}
    </div>
  );
}

function ConsentUI({ next }: { next: string | null }) {
  return (
    <div className="bg-[#0F172A] h-full flex flex-col">
      <ModuleBar title="Consent Form · Module 07" status="Signed" />
      <div className="flex-1 bg-white overflow-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-[#0F172A]">Tattoo Consent & Release</p>
            <p className="text-[10px] text-[#94A3B8]">State of Texas · Adult procedure</p>
          </div>
          <span className="text-[9px] bg-green-50 border border-green-200 text-green-700 px-2 py-0.5 uppercase tracking-widest font-medium">✓ Signed</span>
        </div>
        <div className="border border-[#E5E7EB] p-4 bg-[#F9FAFB] mb-4 space-y-1.5">
          {[["Client name", "Jordan Martinez"], ["Date of birth", "Mar 4, 2001 (Age 24)"], ["ID verified", "TX Driver's License"], ["Procedure", "Blackwork sleeve — forearm"]].map(([l, v]) => (
            <div key={l} className="flex justify-between">
              <span className="text-[10px] text-[#64748B]">{l}</span>
              <span className="text-[10px] font-medium text-[#0F172A]">{v}</span>
            </div>
          ))}
        </div>
        <div className="border border-[#E5E7EB] px-4 py-3 mb-3 bg-white">
          <p className="text-[9px] text-[#94A3B8] mb-2 uppercase tracking-widest">Digital signature</p>
          <div className="border-b border-[#E5E7EB] pb-2 mb-2">
            <p className="text-sm text-[#0F172A]" style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}>Jordan Martinez</p>
          </div>
          <p className="text-[9px] text-[#94A3B8]">Signed Feb 10, 2026 · 3:47 PM · IP: 98.122.xxx.xxx</p>
        </div>
        <p className="text-[9px] text-[#94A3B8]">Legally binding · Stored in client record · Cannot be altered</p>
      </div>
      {next && <FeedsInto next={next} />}
    </div>
  );
}

function BookingUI({ next }: { next: string | null }) {
  return (
    <div className="bg-[#0F172A] h-full flex flex-col">
      <ModuleBar title="Booking #BK-9201 · Module 08" status="Confirmed" />
      <div className="flex-1 bg-white overflow-auto p-5">
        <div className="mb-4 pb-4 border-b border-[#F3F4F6]">
          <p className="text-sm font-semibold text-[#0F172A] mb-0.5">Jordan M. with Sarah M.</p>
          <p className="text-[10px] text-[#64748B]">Blackwork Geometric Sleeve · Session 1 of 2</p>
        </div>
        <div className="space-y-0 mb-5">
          {[["Date", "Tue, Feb 12, 2026"], ["Time", "2:00 PM – 6:00 PM (4hr)"], ["Deposit", "$280.00 ✓ Collected"], ["Consent form", "✓ Signed digitally"], ["SMS reminders", "✓ Feb 10 (48hr) + Feb 12 (day-of)"], ["Artist calendar", "✓ Blocked"], ["Studio notified", "✓ Ink & Iron, Phoenix"]].map(([l, v]) => (
            <div key={l} className="flex items-start justify-between py-2.5 border-b border-[#F3F4F6] last:border-0">
              <span className="text-xs text-[#64748B]">{l}</span>
              <span className={`text-xs font-medium text-right max-w-[180px] ${String(v).includes("✓") ? "text-green-600" : "text-[#0F172A]"}`}>{v}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
          <p className="text-[10px] text-[#94A3B8]">Client confirmation sent · Studio revenue updated</p>
        </div>
      </div>
      {next && <FeedsInto next={next} />}
    </div>
  );
}

function CrmUI({ next }: { next: string | null }) {
  return (
    <div className="bg-[#0F172A] h-full flex flex-col">
      <ModuleBar title="Client Record · Module 09" status="Updated" statusColor="text-blue-400" />
      <div className="flex-1 bg-white overflow-auto">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-[#F3F4F6]">
          <div className="w-9 h-9 bg-[#0F172A] flex items-center justify-center shrink-0">
            <span className="text-[10px] text-white font-bold">JM</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0F172A]">Jordan Martinez</p>
            <p className="text-[10px] text-[#94A3B8]">Client since Jan 2026 · Phoenix, AZ</p>
          </div>
          <span className="ml-auto text-[9px] bg-green-50 border border-green-200 text-green-700 px-2 py-0.5 uppercase tracking-widest">Low risk</span>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-3 pb-4 border-b border-[#F3F4F6]">
            {[["Sessions", "1", ""], ["Total spend", "$280", "text-green-600"], ["Upcoming", "Feb 12", ""]].map(([l, v, c]) => (
              <div key={l} className="text-center">
                <p className={`text-lg font-bold tabular-nums ${c || "text-[#0F172A]"}`}>{v}</p>
                <p className="text-[9px] text-[#94A3B8] uppercase tracking-widest mt-0.5">{l}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest mb-2">Style preferences</p>
            <div className="flex gap-1.5 flex-wrap">
              {["Blackwork", "Geometric", "Wolf motifs"].map(t => (
                <span key={t} className="text-[9px] border border-[#E5E7EB] bg-[#F8FAFC] text-[#64748B] px-2 py-0.5">{t}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest mb-2">Session history</p>
            <div className="flex items-center justify-between py-2 border-b border-[#F3F4F6]">
              <span className="text-xs text-[#374151]">Feb 12, 2026 — Blackwork sleeve</span>
              <span className="text-xs text-green-600 font-medium">Confirmed</span>
            </div>
          </div>
          <div>
            <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest mb-1.5">Artist notes</p>
            <div className="border border-[#E5E7EB] px-3 py-2 bg-[#F9FAFB] text-[10px] text-[#64748B]">Prefers geometric elements. Showed reference of Geometry Wolves Collective.</div>
          </div>
        </div>
      </div>
      {next && <FeedsInto next={next} />}
    </div>
  );
}

function AftercareUI({ next }: { next: string | null }) {
  const timeline = [
    { day: "Day 0",  label: "Aftercare instructions sent", status: "done",    time: "Feb 12 · 6:04 PM" },
    { day: "Day 3",  label: '"How\'s your tattoo healing?"', status: "done",  time: "Feb 15 · 10:00 AM" },
    { day: "Day 7",  label: "Photo check-in request",       status: "pending", time: "Feb 19 · 10:00 AM" },
    { day: "Day 14", label: "Review request sent",           status: "pending", time: "Feb 26 · 10:00 AM" },
  ];
  return (
    <div className="bg-[#0F172A] h-full flex flex-col">
      <ModuleBar title="Aftercare Protocol · Module 10" status="Active" statusColor="text-blue-400" />
      <div className="flex-1 bg-white overflow-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-[#0F172A]">Jordan M.</p>
            <p className="text-[10px] text-[#94A3B8]">Blackwork sleeve · Feb 12</p>
          </div>
          <span className="text-[10px] text-[#94A3B8] uppercase tracking-widest">Auto-scheduled</span>
        </div>
        <div className="space-y-3 mb-5">
          {timeline.map((t) => (
            <div key={t.day} className="flex items-start gap-3">
              <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0">
                <div className={`w-4 h-4 flex items-center justify-center ${t.status === "done" ? "bg-green-500" : "border border-[#CBD5E1] bg-white"}`}>
                  {t.status === "done" && (
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4l1.5 1.5 3.5-3" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  )}
                </div>
                {t !== timeline[timeline.length - 1] && <div className="w-px h-4 bg-[#E5E7EB]" />}
              </div>
              <div className="flex-1 pb-1">
                <div className="flex items-baseline justify-between">
                  <p className="text-xs font-medium text-[#374151]">{t.label}</p>
                  <span className={`text-[9px] font-medium ml-2 shrink-0 ${t.status === "done" ? "text-green-600" : "text-[#94A3B8]"}`}>{t.status === "done" ? "Sent" : "Scheduled"}</span>
                </div>
                <p className="text-[9px] text-[#94A3B8]">{t.day} · {t.time}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-[#F8FAFC] border border-[#E5E7EB] px-4 py-3">
          <p className="text-[10px] text-[#94A3B8]">Zero artist action required · All follow-ups automated</p>
        </div>
      </div>
      {next && <FeedsInto next={next} />}
    </div>
  );
}

function ReviewsUI({ next }: { next: string | null }) {
  return (
    <div className="bg-[#0F172A] h-full flex flex-col">
      <ModuleBar title="Review · Module 11" status="Received" />
      <div className="flex-1 bg-white overflow-auto p-5">
        <div className="text-center py-6 border-b border-[#F3F4F6] mb-5">
          <div className="flex justify-center gap-1 mb-2">
            {[1,2,3,4,5].map(s => (
              <svg key={s} width="18" height="18" viewBox="0 0 24 24" fill="#F59E0B"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            ))}
          </div>
          <p className="text-3xl font-bold text-[#0F172A] tabular-nums">5.0</p>
          <p className="text-[10px] text-[#94A3B8] mt-1">Jordan M. · Feb 26, 2026</p>
        </div>
        <blockquote className="text-sm text-[#374151] leading-relaxed italic mb-5 px-2">
          &ldquo;The deposit system forced me to actually show up — and I&apos;m so glad I did. Sarah&apos;s work is incredible. The whole booking process was smoother than any other studio I&apos;ve used.&rdquo;
        </blockquote>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest">Response sent</p>
            <span className="text-[9px] text-green-600">✓</span>
          </div>
          <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest">Published to</p>
          {["Google Maps · Ink & Iron Studio", "Studio booking page", "InkBook artist profile"].map(d => (
            <div key={d} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
              <span className="text-xs text-[#374151]">{d}</span>
            </div>
          ))}
        </div>
      </div>
      {next && <FeedsInto next={next} />}
    </div>
  );
}

type StepUIProps = { next: string | null };
const STEP_UIS: React.ComponentType<StepUIProps>[] = [
  InquiryUI, AIConsultUI, StyleUI, MatchingUI, QuoteUI,
  DepositUI, ConsentUI, BookingUI, CrmUI, AftercareUI, ReviewsUI,
];

export default function JourneySection() {
  const [active, setActive] = useState(0);
  const ActiveUI = STEP_UIS[active];
  const nextLabel = active < STEPS.length - 1 ? STEPS[active + 1].label : null;

  return (
    <section id="journey" className="bg-white border-t border-[#E5E7EB]">
      {/* Header */}
      <div className="max-w-6xl mx-auto px-6 pt-24 pb-6">
        <p className="label-xs text-[#64748B] mb-4">The complete client operating system</p>
        <h2 className="text-4xl md:text-5xl font-bold tracking-[-0.02em] text-[#0F172A] max-w-2xl">
          Every client interaction runs through InkBook. All eleven.
        </h2>
      </div>

      {/* Progress bar — desktop only */}
      <div className="max-w-6xl mx-auto px-6 pb-8 hidden lg:block">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[#94A3B8] font-mono tabular-nums w-8">
            {String(active + 1).padStart(2, "0")}
          </span>
          <div className="flex-1 h-px bg-[#F3F4F6] overflow-hidden relative">
            <div
              className="absolute inset-y-0 left-0 bg-[#0F172A] h-full"
              style={{
                width: `${((active + 1) / 11) * 100}%`,
                transition: "width 350ms cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            />
          </div>
          <span className="text-[10px] text-[#CBD5E1] font-mono">11</span>
        </div>
      </div>

      {/* Desktop: rail + panel */}
      <div className="hidden lg:block max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-[260px_1fr] gap-6">
          {/* Step rail */}
          <div className="border border-[#E5E7EB] bg-white divide-y divide-[#F3F4F6]" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            {STEPS.map((step, i) => (
              <button
                key={step.n}
                onClick={() => setActive(i)}
                className={`w-full text-left px-4 py-3.5 border-l-[3px] transition-all group ${
                  active === i
                    ? "border-l-[#0F172A] bg-[#F8FAFC]"
                    : "border-l-transparent hover:border-l-[#CBD5E1] hover:bg-[#FAFAFA]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-[9px] tabular-nums font-mono shrink-0 transition-colors ${active === i ? "text-[#0F172A] font-bold" : "text-[#CBD5E1] group-hover:text-[#94A3B8]"}`}>
                    {step.n}
                  </span>
                  <span className={`text-sm transition-colors ${active === i ? "text-[#0F172A] font-semibold" : "text-[#64748B] font-medium group-hover:text-[#0F172A]"}`}>
                    {step.label}
                  </span>
                  {active === i && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                  )}
                </div>
                {active === i && (
                  <p className="text-[10px] text-[#94A3B8] leading-relaxed mt-1.5 pl-7">{step.desc}</p>
                )}
              </button>
            ))}
          </div>

          {/* Product panel — key triggers panel-enter animation on step change */}
          <div
            key={active}
            className="overflow-hidden min-h-[520px] animate-panel-enter"
            style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.10), 0 32px 80px rgba(0,0,0,0.12)" }}
          >
            <ActiveUI next={nextLabel} />
          </div>
        </div>
      </div>

      {/* Mobile: accordion */}
      <div className="lg:hidden px-6 pb-16 space-y-2">
        {STEPS.map((step, i) => {
          const StepUI = STEP_UIS[i];
          const stepNext = i < STEPS.length - 1 ? STEPS[i + 1].label : null;
          return (
            <div key={step.n} className="border border-[#E5E7EB]">
              <button
                onClick={() => setActive(active === i ? -1 : i)}
                className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-[#F8FAFC] transition-colors"
              >
                <span className="text-[10px] text-[#CBD5E1] font-mono">{step.n}</span>
                <span className={`text-sm font-medium flex-1 ${active === i ? "text-[#0F172A]" : "text-[#64748B]"}`}>{step.label}</span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`text-[#94A3B8] transition-transform ${active === i ? "rotate-180" : ""}`}>
                  <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {active === i && (
                <div className="px-4 pb-4">
                  <p className="text-xs text-[#94A3B8] mb-4">{step.desc}</p>
                  <div className="h-64 overflow-hidden" style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.08)" }}>
                    <StepUI next={stepNext} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
