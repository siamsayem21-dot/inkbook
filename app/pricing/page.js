"use client";

import { useState } from "react";

const PLANS = [
  {
    id: "solo",
    name: "Solo",
    price: 49,
    description: "Perfect for independent artists",
    priceId: process.env.NEXT_PUBLIC_STRIPE_SOLO_PRICE_ID,
    artists: "1 artist",
    features: [
      "1 artist profile",
      "Unlimited bookings",
      "Stripe deposit collection",
      "Digital consent forms",
      "SMS reminders",
      "Client blacklist",
      "White-label booking page",
    ],
  },
  {
    id: "studio",
    name: "Studio",
    price: 79,
    description: "For growing studios",
    priceId: process.env.NEXT_PUBLIC_STRIPE_STUDIO_PRICE_ID,
    artists: "2–5 artists",
    popular: true,
    features: [
      "Up to 5 artist profiles",
      "Unlimited bookings",
      "Stripe deposit collection",
      "Digital consent forms",
      "SMS reminders",
      "Client blacklist",
      "White-label booking page",
      "Owner dashboard",
      "Revenue analytics",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 129,
    description: "For established studios",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
    artists: "6+ artists",
    features: [
      "Unlimited artist profiles",
      "Unlimited bookings",
      "Stripe deposit collection",
      "Digital consent forms",
      "SMS reminders",
      "Client blacklist",
      "White-label booking page",
      "Owner dashboard",
      "Revenue analytics",
      "Waitlist management",
      "Session agreements",
      "Priority support",
    ],
  },
];

export default function PricingPage() {
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);

  async function handleSelectPlan(plan) {
    setLoading(plan.id);
    setError(null);

    try {
      const res = await fetch("/api/billing/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: plan.priceId, planId: plan.id }),
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(null);
        return;
      }

      window.location.href = data.url;
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E8E8E8] px-4 py-16">
      {/* Header */}
      <div className="text-center mb-14 max-w-xl mx-auto">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-[#c9a84c] flex items-center justify-center">
            <span className="text-black text-xs font-black">IB</span>
          </div>
          <span className="text-[#E8E8E8] font-bold text-lg">InkBook</span>
        </div>
        <h1 className="text-4xl font-bold text-[#E8E8E8] mb-4">
          Simple, transparent pricing
        </h1>
        <p className="text-zinc-400 text-base">
          One plan. One price. Everything you need to run your studio.
          <br />Plus a <span className="text-[#c9a84c]">1% transaction fee</span> on bookings — only when you earn.
        </p>
      </div>

      {error && (
        <div className="max-w-md mx-auto mb-8 bg-red-950 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3 text-center">
          {error}
        </div>
      )}

      {/* Plans */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`relative flex flex-col rounded-2xl border p-7 transition-colors ${
              plan.popular
                ? "bg-[#111] border-[#c9a84c]/50"
                : "bg-[#111] border-[#1E1E1E] hover:border-[#2A2A2A]"
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-[#c9a84c] text-black text-xs font-bold px-3 py-1 rounded-full">
                  Most Popular
                </span>
              </div>
            )}

            <div className="mb-6">
              <h2 className="text-lg font-bold text-[#E8E8E8] mb-1">{plan.name}</h2>
              <p className="text-xs text-zinc-500 mb-4">{plan.description}</p>

              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-bold text-[#c9a84c]">${plan.price}</span>
                <span className="text-zinc-500 text-sm mb-1.5">/mo</span>
              </div>
              <p className="text-xs text-zinc-500">{plan.artists}</p>
            </div>

            <ul className="flex flex-col gap-2.5 mb-8 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-300">
                  <svg
                    className="w-4 h-4 text-[#c9a84c] shrink-0 mt-0.5"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      d="M3 8l3.5 3.5L13 4.5"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSelectPlan(plan)}
              disabled={loading !== null}
              className={`w-full py-3 rounded-lg font-bold text-sm transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                plan.popular
                  ? "bg-[#c9a84c] text-black hover:bg-[#a8832e] disabled:opacity-60"
                  : "bg-[#1A1A1A] text-[#E8E8E8] border border-[#2A2A2A] hover:border-[#c9a84c]/50 hover:text-[#c9a84c] disabled:opacity-60"
              }`}
            >
              {loading === plan.id ? (
                <>
                  <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Redirecting…
                </>
              ) : (
                `Get ${plan.name} →`
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <p className="text-center text-xs text-zinc-600 mt-12">
        All plans include a 14-day free trial. No credit card required to start.
        Cancel anytime.
      </p>
    </div>
  );
}
