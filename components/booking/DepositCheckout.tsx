"use client";

import { useState } from "react";

interface Props {
  bookingId: string;
  depositAmountCents: number;
  studioSlug: string;
  artistId: string;
}

export default function DepositCheckout({
  bookingId,
  depositAmountCents,
  studioSlug,
  artistId,
}: Props) {
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
      {/* Order summary */}
      <div className="bg-zinc-900 border border-white/10 rounded-2xl p-5 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-white/50">Booking deposit</span>
          <span className="font-semibold">${depositDollars}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-white/50">Processing fee</span>
          <span className="text-white/30">Included</span>
        </div>
        <div className="border-t border-white/10 pt-3 flex justify-between font-bold">
          <span>Total due today</span>
          <span className="text-gold">${depositDollars}</span>
        </div>
      </div>

      <p className="text-xs text-white/30 leading-relaxed">
        You will be redirected to Stripe&apos;s secure payment page. The deposit is applied toward your session.
        It is <span className="text-white/50">non-refundable</span> for no-shows or cancellations within 48 hours.
      </p>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <button
        onClick={handleCheckout}
        disabled={loading}
        className="w-full bg-gold text-black font-bold py-3.5 rounded-full hover:bg-gold-light disabled:opacity-50 transition-colors text-sm"
      >
        {loading ? "Redirecting to payment…" : `Pay $${depositDollars} deposit →`}
      </button>
    </div>
  );
}
