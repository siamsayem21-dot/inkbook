"use client";

import { useState } from "react";

interface Props {
  bookingId: string;
  depositAmountCents: number;
  studioSlug: string;
  artistId: string;
}

export default function DepositCheckout({ bookingId, depositAmountCents, studioSlug, artistId }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const depositDollars = (depositAmountCents / 100).toFixed(2);

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, studioSlug, artistId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to start checkout. Please try again.");
        setLoading(false);
        return;
      }

      window.location.href = data.url;
    } catch {
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="border border-zinc-200 rounded-xl p-5 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Booking deposit</span>
          <span className="font-semibold">${depositDollars}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Processing fee</span>
          <span className="text-zinc-400">Included</span>
        </div>
        <hr className="border-zinc-200" />
        <div className="flex justify-between font-semibold">
          <span>Total due today</span>
          <span>${depositDollars}</span>
        </div>
      </div>

      <p className="text-xs text-zinc-400">
        You will be redirected to Stripe&apos;s secure payment page. The deposit is applied toward your session.
        It is <strong>non-refundable</strong> if you no-show or cancel within 48 hours.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <button
        onClick={handleCheckout}
        disabled={loading}
        className="w-full bg-zinc-900 text-white font-semibold py-3 rounded-full hover:bg-zinc-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Redirecting to payment…" : `Pay $${depositDollars} deposit →`}
      </button>
    </div>
  );
}
