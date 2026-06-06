"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Solo",
    monthlyPrice: 49,
    artists: "1 artist",
    highlight: false,
    features: [
      "White-label booking page",
      "AI consultation intake",
      "Mandatory deposit enforcement",
      "Digital consent forms",
      "SMS reminders (48hr + day-of)",
      "Flash + custom request flow",
      "Artist dashboard",
    ],
  },
  {
    name: "Studio",
    monthlyPrice: 99,
    artists: "2–5 artists",
    highlight: true,
    features: [
      "Everything in Solo",
      "Multi-artist dashboard",
      "Owner revenue reports",
      "AI artist matching & routing",
      "Client blacklist",
      "Session agreements",
      "Waitlist management",
      "Priority support",
    ],
  },
  {
    name: "Pro",
    monthlyPrice: 179,
    artists: "6+ artists",
    highlight: false,
    features: [
      "Everything in Studio",
      "Unlimited artists",
      "Advanced analytics",
      "ID verification",
      "Custom domain",
      "White-glove setup call",
      "Dedicated account manager",
    ],
  },
];

export default function PricingSection() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="px-6 py-24">
      <div className="max-w-5xl mx-auto">

        <div className="text-center mb-12">
          <p className="label-xs text-gold/70 mb-4">Transparent Pricing</p>
          <h2 className="font-cinzel text-3xl md:text-4xl font-bold tracking-wide mb-4">
            Simple pricing. No surprises.
          </h2>
          <p className="text-zinc-500 text-sm">14-day free trial on all plans. No credit card required.</p>

          {/* Annual toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className={`label-xs transition-colors ${!annual ? "text-white" : "text-zinc-600"}`}>Monthly</span>
            <button
              onClick={() => setAnnual(!annual)}
              aria-label="Toggle annual billing"
              className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${annual ? "bg-red-600" : "bg-zinc-700"}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${annual ? "left-5" : "left-0.5"}`} />
            </button>
            <span className={`label-xs transition-colors ${annual ? "text-white" : "text-zinc-600"}`}>
              Annual <span className="text-green-400">— Save 17%</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((p) => {
            const price = annual ? Math.round(p.monthlyPrice * 0.83) : p.monthlyPrice;
            return (
              <div
                key={p.name}
                className={`border p-7 flex flex-col relative ${
                  p.highlight
                    ? "border-gold/40 bg-zinc-900/60"
                    : "border-white/[0.08] bg-zinc-900/20"
                }`}
              >
                {p.highlight && (
                  <span className="label-xs text-black bg-gold px-4 py-1.5 absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    Recommended
                  </span>
                )}
                <div className="mb-7 mt-2">
                  <h3 className="font-cinzel text-lg font-bold tracking-wide mb-1">{p.name}</h3>
                  <p className="label-xs text-zinc-600 mb-5">{p.artists}</p>
                  <div className="flex items-end gap-1">
                    <span className="font-cinzel text-4xl font-black text-gold">${price}</span>
                    <span className="text-zinc-500 mb-1 text-sm">/mo</span>
                  </div>
                  {annual && (
                    <p className="text-[10px] text-green-400 mt-1">Billed ${price * 12}/yr</p>
                  )}
                </div>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {p.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5">
                      <Check className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                      <span className="text-zinc-400 text-xs">{feat}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`text-center py-3.5 label-sm transition-all ${
                    p.highlight
                      ? "bg-[#DC2626] text-white hover:bg-[#b91c1c]"
                      : "border border-white/20 text-zinc-400 hover:border-white/40 hover:text-white"
                  }`}
                >
                  Start Free Trial
                </Link>
                <p className="text-[10px] text-zinc-700 text-center mt-2">No credit card required</p>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-zinc-700 mt-6">+ 1% transaction fee on all bookings</p>
      </div>
    </section>
  );
}
