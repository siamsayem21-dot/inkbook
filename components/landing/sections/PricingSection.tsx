"use client";

import { useState } from "react";
import Link from "next/link";

const TIERS = [
  {
    name: "Solo",
    sub: "1 artist",
    monthly: 49,
    annual: 41,
    popular: false,
    features: [
      "White-label booking page",
      "AI consultation intake",
      "Stripe deposit enforcement",
      "Digital consent forms",
      "SMS reminders (48hr + day-of)",
      "Client profile & notes",
      "Artist dashboard",
    ],
  },
  {
    name: "Studio",
    sub: "2–5 artists",
    monthly: 79,
    annual: 66,
    popular: true,
    features: [
      "Everything in Solo",
      "Multi-artist scheduling",
      "Owner revenue dashboard",
      "AI artist matching & routing",
      "Client blacklist",
      "Session agreements",
      "Waitlist management",
    ],
  },
  {
    name: "Pro",
    sub: "6+ artists",
    monthly: 129,
    annual: 107,
    popular: false,
    features: [
      "Everything in Studio",
      "Unlimited artists",
      "ID verification",
      "Custom domain",
      "Advanced analytics",
      "White-glove setup call",
      "Dedicated account manager",
    ],
  },
] as const;

export default function PricingSection() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="px-6 py-24 md:py-32 border-t border-white/[0.06]">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12 md:mb-14">
          <p className="text-[11px] tracking-[0.18em] uppercase text-zinc-600 font-medium mb-4">
            Pricing
          </p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight text-white mb-5">
            Simple. Predictable.
            <br />
            No surprises.
          </h2>
          <p className="text-zinc-500 text-base max-w-md leading-relaxed mb-8">
            14-day free trial on all plans. No credit card required.
          </p>

          {/* Toggle */}
          <div className="flex items-center gap-3">
            <span className={`text-[13px] transition-colors ${!annual ? "text-white" : "text-zinc-600"}`}>
              Monthly
            </span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative w-10 h-5 transition-colors duration-200 ${annual ? "bg-white" : "bg-white/10"}`}
              aria-label="Toggle annual billing"
            >
              <span
                className={`absolute top-0.5 w-4 h-4 bg-black transition-transform duration-200 ${annual ? "translate-x-5" : "translate-x-0.5"}`}
              />
            </button>
            <span className={`text-[13px] transition-colors ${annual ? "text-white" : "text-zinc-600"}`}>
              Annual{" "}
              <span className="text-emerald-400 text-[11px] font-medium">
                — save 17%
              </span>
            </span>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/[0.06]">
          {TIERS.map((tier) => {
            const price = annual ? tier.annual : tier.monthly;
            return (
              <div
                key={tier.name}
                className={`relative px-6 py-8 flex flex-col ${
                  tier.popular
                    ? "bg-white/[0.05]"
                    : "bg-[#090909]"
                }`}
              >
                {tier.popular && (
                  <div className="absolute top-0 inset-x-0 h-px bg-white/20" />
                )}

                {/* Tier name */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-[13px] font-semibold text-white">{tier.name}</h3>
                    {tier.popular && (
                      <span className="text-[10px] tracking-[0.1em] uppercase px-2 py-0.5 bg-white/10 text-zinc-300 font-medium">
                        Most popular
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-600">{tier.sub}</p>
                </div>

                {/* Price */}
                <div className="mb-8">
                  <div className="flex items-end gap-1.5 mb-1">
                    <span className="text-4xl font-bold text-white tabular-nums tracking-tight">
                      ${price}
                    </span>
                    <span className="text-zinc-600 text-sm mb-1">/mo</span>
                  </div>
                  {annual && (
                    <p className="text-[11px] text-zinc-600">
                      Billed annually (${price * 12}/yr)
                    </p>
                  )}
                </div>

                {/* CTA */}
                <Link
                  href="#"
                  className={`flex items-center justify-center h-10 text-[13px] font-medium mb-8 transition-colors duration-200 ${
                    tier.popular
                      ? "bg-white text-black hover:bg-zinc-100"
                      : "border border-white/[0.12] text-zinc-300 hover:border-white/25 hover:text-white"
                  }`}
                >
                  Start free trial
                </Link>

                {/* Features */}
                <ul className="space-y-3 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        className="text-zinc-500 shrink-0 mt-0.5"
                      >
                        <path
                          d="M2 6l3 3 5-5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span className="text-[12px] text-zinc-500 leading-snug">{f}</span>
                    </li>
                  ))}
                </ul>

                <p className="mt-6 text-[11px] text-zinc-700">No credit card required</p>
              </div>
            );
          })}
        </div>

        <p className="text-[12px] text-zinc-700 mt-6 text-center">
          + 1% transaction fee on all bookings · Annual billing saves 2 months · Enterprise pricing available
        </p>
      </div>
    </section>
  );
}
