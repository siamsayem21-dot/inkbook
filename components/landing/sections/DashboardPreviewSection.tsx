"use client";

import { useState } from "react";

const REVENUE_DATA = [892, 1140, 980, 1520, 1380, 1840, 1960];
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

function Sparkline({ values, color = "#0F172A" }: { values: number[]; color?: string }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const W = 44, H = 18;
  const pts = values
    .map((v, i) => {
      const x = ((i / (values.length - 1)) * W).toFixed(1);
      const y = (H - ((v - min) / range) * (H - 2) - 1).toFixed(1);
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none" className="opacity-50 shrink-0">
      <polyline points={pts} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RevenueAreaChart({ data }: { data: number[] }) {
  const max = Math.max(...data);
  const H = 80;
  const W = 100;

  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - (v / max) * H * 0.85 - 4,
  }));

  const lineD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
  const areaD = `${lineD} L${W},${H} L0,${H} Z`;

  return (
    <div className="relative">
      <div className="h-20 w-full">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-full">
          <defs>
            <linearGradient id="revAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0F172A" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#0F172A" stopOpacity="0.00" />
            </linearGradient>
          </defs>
          <path d={areaD} fill="url(#revAreaGrad)" />
          <path d={lineD} fill="none" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <circle
            cx={points[points.length - 1].x.toFixed(2)}
            cy={points[points.length - 1].y.toFixed(2)}
            r="2"
            fill="#0F172A"
          />
        </svg>
      </div>
      {/* Today callout */}
      <div className="absolute top-0 right-0 text-right pointer-events-none">
        <span className="text-[9px] font-bold text-[#0F172A] tabular-nums block">$1,960</span>
        <span className="text-[8px] text-[#94A3B8]">today</span>
      </div>
    </div>
  );
}

function OwnerDashboard() {
  const metrics = [
    { label: "Revenue", value: "$48,320", sub: "this quarter", trend: "+22% vs last qtr", color: "text-green-600", spark: [28, 34, 29, 44, 38, 52, 63], sparkColor: "#16a34a" },
    { label: "Active leads", value: "23", sub: "in pipeline", trend: "↑ 8 new this week", color: "text-blue-600", spark: [10, 13, 11, 16, 14, 18, 23], sparkColor: "#2563eb" },
    { label: "Booking rate", value: "78%", sub: "inquiry → booked", trend: "+5% vs last mo.", color: "text-[#0F172A]", spark: [60, 63, 68, 66, 70, 74, 78], sparkColor: "#0F172A" },
    { label: "Consultations", value: "47", sub: "this month", trend: "42 handled by AI", color: "text-purple-600", spark: [18, 24, 20, 31, 28, 38, 47], sparkColor: "#9333ea" },
    { label: "Deposits", value: "$6,240", sub: "auto-collected", trend: "100% collection", color: "text-green-600", spark: [55, 62, 58, 72, 68, 82, 100], sparkColor: "#16a34a" },
  ];

  const artists = [
    { name: "Sarah M.", sessions: 18, revenue: "$4,200", active: true, util: 90 },
    { name: "Jake R.", sessions: 14, revenue: "$3,100", active: true, util: 68 },
    { name: "Mia C.", sessions: 15, revenue: "$3,840", active: false, util: 100 },
  ];

  const activity = [
    { dot: "bg-green-500", label: "Deposit collected", detail: "Jordan M. · $280 · Blackwork sleeve", time: "2:34 PM" },
    { dot: "bg-blue-400", label: "Lead qualified by AI", detail: "Sam T. · Neo-trad · $400–600 budget", time: "1:15 PM" },
    { dot: "bg-purple-400", label: "Booking confirmed", detail: "Alex R. · Fine line · Feb 18, 2:00 PM", time: "11:42 AM" },
  ];

  return (
    <div
      className="bg-white border border-[#E5E7EB] overflow-hidden"
      style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.10), 0 32px 80px rgba(0,0,0,0.12)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#E5E7EB] bg-[#F8FAFC]">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span className="text-xs text-[#374151] font-medium">Ink & Iron Studio — Owner View</span>
        </div>
        <span className="text-[10px] text-[#94A3B8] uppercase tracking-widest">Q2 2026</span>
      </div>

      {/* Metrics with sparklines */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-[#E5E7EB] border-b border-[#E5E7EB]">
        {metrics.map((m) => (
          <div key={m.label} className="px-4 py-4">
            <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest mb-2">{m.label}</p>
            <div className="flex items-end justify-between gap-1 mb-1">
              <p className="text-[#0F172A] text-xl font-bold tabular-nums">{m.value}</p>
              <Sparkline values={m.spark} color={m.sparkColor} />
            </div>
            <p className="text-[10px] text-[#94A3B8]">{m.sub}</p>
            <p className={`text-[10px] mt-1 font-medium ${m.color}`}>{m.trend}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-[#E5E7EB]">
        {/* Revenue area chart */}
        <div className="px-5 py-5 border-b md:border-b-0 border-[#E5E7EB]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest">Revenue — last 7 days</p>
            <span className="text-[10px] text-green-600 font-medium">↑ 18% vs prior week</span>
          </div>
          <RevenueAreaChart data={REVENUE_DATA} />
          <div className="flex justify-between mt-1.5">
            {DAYS.map((d, i) => (
              <span key={i} className="text-[9px] text-[#94A3B8] flex-1 text-center">{d}</span>
            ))}
          </div>
        </div>

        {/* Artist performance with utilization */}
        <div className="px-5 py-5">
          <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest mb-4">Artist performance</p>
          <div className="space-y-4">
            {artists.map((a) => (
              <div key={a.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${a.active ? "bg-green-500" : "bg-[#CBD5E1]"}`} />
                    <span className="text-sm text-[#374151]">{a.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] text-[#94A3B8]">{a.sessions} sessions</span>
                    <span className="text-sm text-[#0F172A] font-semibold tabular-nums">{a.revenue}</span>
                  </div>
                </div>
                <div className="h-1 bg-[#F3F4F6] overflow-hidden">
                  <div
                    className={`h-full transition-all ${a.util >= 95 ? "bg-orange-400" : "bg-[#0F172A]"}`}
                    style={{ width: `${a.util}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-[#F3F4F6] flex items-center justify-between">
            <span className="text-[10px] text-[#94A3B8]">Studio total</span>
            <span className="text-sm font-bold text-[#0F172A] tabular-nums">$11,140</span>
          </div>
        </div>
      </div>

      {/* Live activity feed */}
      <div className="border-t border-[#E5E7EB] px-5 py-4 bg-[#FAFAFA]">
        <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest mb-3">Live activity</p>
        <div className="space-y-2.5">
          {activity.map((item, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.dot}`} />
                <span className="text-[10px] text-[#374151] font-medium shrink-0">{item.label}</span>
                <span className="text-[10px] text-[#94A3B8] truncate hidden sm:block">{item.detail}</span>
              </div>
              <span className="text-[9px] text-[#CBD5E1] shrink-0">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ArtistDashboard() {
  const upcoming = [
    { time: "9:00 AM", client: "Jordan M.", detail: "Blackwork sleeve — 4hr session", deposit: "$200 paid", status: "confirmed" },
    { time: "2:00 PM", client: "Alex R.", detail: "Fine line botanical — 2hr", deposit: "$100 paid", status: "confirmed" },
    { time: "4:30 PM", client: "Casey T.", detail: "Portrait consult — 30min", deposit: "—", status: "consult" },
  ];

  const requests = [
    { initials: "PL", name: "Parker L.", style: "Blackwork geometric", budget: "$350–500" },
    { initials: "MN", name: "Morgan N.", style: "Dotwork mandala", budget: "$500+" },
    { initials: "DS", name: "Dev S.", style: "Neo-trad snake", budget: "$280–400" },
  ];

  return (
    <div
      className="bg-white border border-[#E5E7EB] overflow-hidden"
      style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.10), 0 32px 80px rgba(0,0,0,0.12)" }}
    >
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#E5E7EB] bg-[#F8FAFC]">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span className="text-xs text-[#374151] font-medium">Sarah M. — Artist View</span>
        </div>
        <span className="text-[10px] text-[#94A3B8] uppercase tracking-widest">Today, Jun 7</span>
      </div>

      <div className="grid grid-cols-3 divide-x divide-[#E5E7EB] border-b border-[#E5E7EB]">
        <div className="px-4 py-4">
          <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest mb-2">Earnings</p>
          <div className="flex items-end justify-between gap-1 mb-1">
            <p className="text-[#0F172A] text-xl font-bold tabular-nums">$1,840</p>
            <Sparkline values={[900, 1100, 980, 1400, 1200, 1600, 1840]} color="#16a34a" />
          </div>
          <p className="text-[10px] text-[#94A3B8]">this week</p>
        </div>
        <div className="px-4 py-4">
          <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest mb-2">Sessions</p>
          <p className="text-[#0F172A] text-xl font-bold tabular-nums mt-1 mb-1">8</p>
          <p className="text-[10px] text-[#94A3B8]">this week</p>
        </div>
        <div className="px-4 py-4">
          <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest mb-2">Requests</p>
          <p className="text-blue-600 text-xl font-bold tabular-nums mt-1 mb-1">3</p>
          <p className="text-[10px] text-[#94A3B8]">need review</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-[#E5E7EB]">
        <div className="px-5 py-5 border-b md:border-b-0 border-[#E5E7EB]">
          <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest mb-4">Today&apos;s schedule</p>
          <div className="space-y-3">
            {upcoming.map((s, i) => (
              <div key={i} className="flex items-start justify-between gap-3 pb-2.5 border-b border-[#F3F4F6] last:border-0 last:pb-0">
                <div className="flex items-start gap-2.5">
                  <span className="text-[10px] text-[#94A3B8] w-14 shrink-0 mt-0.5">{s.time}</span>
                  <div>
                    <p className="text-xs text-[#0F172A] font-semibold">{s.client}</p>
                    <p className="text-[10px] text-[#94A3B8]">{s.detail}</p>
                    <p className="text-[10px] text-green-600 mt-0.5">{s.deposit}</p>
                  </div>
                </div>
                <span className={`text-[9px] px-2 py-0.5 uppercase tracking-widest shrink-0 border font-medium ${
                  s.status === "confirmed"
                    ? "bg-green-50 border-green-200 text-green-700"
                    : "bg-blue-50 border-blue-200 text-blue-700"
                }`}>
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 py-5">
          <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest mb-4">AI-qualified requests</p>
          <div className="space-y-3">
            {requests.map((r, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center shrink-0">
                    <span className="text-[9px] text-[#64748B] font-bold">{r.initials}</span>
                  </div>
                  <div>
                    <p className="text-xs text-[#374151] font-medium">{r.name}</p>
                    <p className="text-[10px] text-[#94A3B8]">{r.style} · {r.budget}</p>
                  </div>
                </div>
                <span className="text-[9px] bg-blue-50 border border-blue-200 text-blue-700 px-2 py-0.5 uppercase tracking-widest shrink-0 font-medium">
                  Review
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPreviewSection() {
  const [active, setActive] = useState<"owner" | "artist">("owner");

  return (
    <section id="dashboard" className="relative px-6 py-24 bg-[#F8FAFC] border-t border-[#E5E7EB]">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 40% at 50% 100%, rgba(15,23,42,0.04) 0%, transparent 100%)" }} />
      <div className="max-w-6xl mx-auto">

        <div className="mb-12">
          <p className="label-xs text-[#64748B] mb-4">Business intelligence</p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-[-0.02em] mb-4 text-[#0F172A]">
            One dashboard. Zero spreadsheets.
          </h2>
          <p className="text-[#64748B] text-base max-w-lg">
            Real-time revenue, team performance, lead intelligence, and booking trends — all in one place. No exports. No guesswork.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex mb-8">
          <div className="flex border border-[#E5E7EB] bg-[#F8FAFC]">
            {(["owner", "artist"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActive(tab)}
                className={`text-sm px-6 py-2.5 transition-all font-medium ${
                  active === tab
                    ? "bg-white text-[#0F172A] shadow-sm border-r border-[#E5E7EB] last:border-r-0"
                    : "text-[#94A3B8] hover:text-[#64748B]"
                }`}
              >
                {tab === "owner" ? "Owner dashboard" : "Artist dashboard"}
              </button>
            ))}
          </div>
        </div>

        {active === "owner" ? <OwnerDashboard /> : <ArtistDashboard />}
      </div>
    </section>
  );
}
