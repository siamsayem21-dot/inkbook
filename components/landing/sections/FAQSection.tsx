"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "Does InkBook work for solo artists or just multi-artist studios?",
    a: "InkBook works for both. The Solo plan ($49/mo) is built specifically for solo artists — one booking page, full AI intake, deposits, consent forms, and your own dashboard. No team management overhead.",
  },
  {
    q: "Can I use my own domain for the booking page?",
    a: "Yes. Pro plan includes custom domain support. On Solo and Studio plans, you get a subdomain under inkbook.co. Clients never see InkBook branding — your URL, your logo, your colors.",
  },
  {
    q: "How does the deposit enforcement work?",
    a: "Deposits are collected via Stripe at the moment of booking and cannot be disabled. If a client no-shows, the deposit is automatically kept — no manual action required. Cancellation refund rules are set by you.",
  },
  {
    q: "Is the AI consultation customizable for my studio?",
    a: "Yes. You control which styles you accept, minimum budget thresholds, placement restrictions, and custom intake questions. The AI uses your settings to qualify and filter leads before they reach you.",
  },
  {
    q: "What happens to my existing client data when I switch?",
    a: "We handle the migration for free. Our team imports your client records, booking history, and any existing digital forms. Most studios are fully live within 48 hours of signing up.",
  },
  {
    q: "Do clients need to create an account to book?",
    a: "No. Clients book, pay deposits, and sign consent forms without creating an account. They need a name, email, and phone number. ID photo is required at session check-in.",
  },
  {
    q: "How are SMS reminders handled?",
    a: "InkBook sends automated SMS reminders 48 hours before and the morning of every session. All messages come from a platform number — your personal number is never shared with clients.",
  },
  {
    q: "Can I cancel my plan anytime?",
    a: "Yes. No contracts, no cancellation fees. If you cancel, your account stays active until the end of your current billing period.",
  },
];

export default function FAQSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="px-6 py-24" style={{ backgroundColor: "#070707" }}>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-14">
          <p className="label-xs text-gold/70 mb-4">FAQ</p>
          <h2 className="font-cinzel text-3xl md:text-4xl font-bold tracking-wide">
            Common questions.
          </h2>
        </div>
        <div className="space-y-px">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-white/[0.07] bg-zinc-900/20">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-start justify-between px-6 py-5 text-left gap-4"
              >
                <span className="text-sm text-white font-medium leading-snug">{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-zinc-500 shrink-0 mt-0.5 transition-transform duration-200 ${open === i ? "rotate-180" : ""}`}
                />
              </button>
              {open === i && (
                <div className="px-6 pb-5">
                  <p className="text-zinc-500 text-sm leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
