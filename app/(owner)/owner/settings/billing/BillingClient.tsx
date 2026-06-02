"use client";

import { useState } from "react";
import Link from "next/link";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active:   { label: "Active",   className: "bg-green-500/10 text-green-400 border-green-500/20" },
  trialing: { label: "Free trial", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  past_due: { label: "Past due", className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  canceled: { label: "Canceled", className: "bg-red-500/10 text-red-400 border-red-500/20" },
  unpaid:   { label: "Unpaid",   className: "bg-red-500/10 text-red-400 border-red-500/20" },
};

export default function BillingClient({
  planLabel,
  planPrice,
  planArtists,
  subscriptionStatus,
  hasStripeCustomer,
}: {
  planLabel: string;
  planPrice: string;
  planArtists: string;
  subscriptionStatus: string;
  hasStripeCustomer: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const badge = STATUS_BADGE[subscriptionStatus] ?? STATUS_BADGE.trialing;

  async function openPortal() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not open billing portal. Please try again.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
      {error && (
        <div className="bg-red-950 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">{planLabel} plan</p>
          <p className="text-zinc-400 text-sm">
            {planPrice} · {planArtists}
          </p>
        </div>
        <span className={`text-xs border px-2.5 py-1 rounded-full ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      <hr className="border-zinc-800" />

      {subscriptionStatus === "trialing" && (
        <p className="text-sm text-zinc-400">
          You&apos;re on a free trial.{" "}
          <Link href="/pricing" className="text-[#c9a84c] hover:underline">
            Choose a plan
          </Link>{" "}
          to keep access after your trial ends.
        </p>
      )}

      {subscriptionStatus === "past_due" && (
        <p className="text-sm text-yellow-400">
          Your payment is past due. Update your payment method to keep your subscription active.
        </p>
      )}

      {(subscriptionStatus === "canceled" || subscriptionStatus === "unpaid") && (
        <p className="text-sm text-red-400">
          Your subscription is inactive.{" "}
          <Link href="/pricing" className="text-[#c9a84c] hover:underline">
            Resubscribe
          </Link>{" "}
          to restore access.
        </p>
      )}

      {hasStripeCustomer && (
        <div className="flex gap-3 pt-2">
          <button
            onClick={openPortal}
            disabled={loading}
            className="text-sm bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-full disabled:opacity-50"
          >
            {loading ? "Opening…" : "Manage subscription"}
          </button>
          <button
            onClick={openPortal}
            disabled={loading}
            className="text-sm bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-full disabled:opacity-50"
          >
            Update payment method
          </button>
        </div>
      )}

      {!hasStripeCustomer && (
        <div className="pt-2">
          <Link
            href="/pricing"
            className="inline-block text-sm bg-[#c9a84c] text-black font-bold px-5 py-2 rounded-full hover:bg-[#a8832e] transition-colors"
          >
            Subscribe now
          </Link>
        </div>
      )}
    </div>
  );
}
