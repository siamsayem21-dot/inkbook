"use client";

import { useState } from "react";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active:   { label: "Active",    className: "bg-green-500/10 text-green-400 border-green-500/20" },
  trialing: { label: "Trial",     className: "bg-gold/10 text-gold border-gold/20" },
  past_due: { label: "Past Due",  className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  canceled: { label: "Canceled",  className: "bg-red-500/10 text-red-400 border-red-500/20" },
  unpaid:   { label: "Unpaid",    className: "bg-red-500/10 text-red-400 border-red-500/20" },
};

export default function PlanBanner({
  planLabel,
  subscriptionStatus,
}: {
  planLabel: string;
  subscriptionStatus: string;
}) {
  const [loading, setLoading] = useState(false);
  const badge = STATUS_BADGE[subscriptionStatus] ?? STATUS_BADGE.trialing;

  async function handleManagePlan() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error ?? "Could not open billing portal. Please try again.");
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-between border border-white/[0.08] px-5 py-4">
      <div className="flex items-center gap-3">
        <span className="font-cinzel text-sm font-semibold text-zinc-300 tracking-wide">{planLabel}</span>
        <span className={`label-xs border px-2.5 py-1 ${badge.className}`}>
          {badge.label}
        </span>
      </div>
      <button
        onClick={handleManagePlan}
        disabled={loading}
        className="label-xs text-zinc-500 hover:text-gold transition-colors disabled:opacity-50"
      >
        {loading ? "Opening…" : "Manage Plan →"}
      </button>
    </div>
  );
}
