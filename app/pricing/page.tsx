import Link from "next/link";

const plans = [
  {
    name: "Solo",
    price: "$49",
    period: "/mo",
    artists: "1 artist",
    description: "Perfect for independent tattoo artists.",
    features: ["White-label booking page", "Stripe deposit enforcement", "Digital consent forms", "SMS reminders (Twilio)", "Artist dashboard"],
  },
  {
    name: "Studio",
    price: "$79",
    period: "/mo",
    artists: "2–5 artists",
    description: "For small studios with a team.",
    features: ["Everything in Solo", "Owner dashboard", "Revenue reporting", "Artist management", "Client blacklist"],
    highlighted: true,
  },
  {
    name: "Pro",
    price: "$129",
    period: "/mo",
    artists: "6+ artists",
    description: "For established studios scaling up.",
    features: ["Everything in Studio", "Session agreements", "Waitlist system", "ID verification", "Advanced analytics"],
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white px-6 py-20">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-4">Simple pricing</h1>
        <p className="text-zinc-400 text-center mb-12">
          All plans include a 1% transaction fee on bookings. One prevented no-show pays for a month.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-8 flex flex-col ${
                plan.highlighted
                  ? "border-white bg-zinc-900"
                  : "border-zinc-800 bg-zinc-900/50"
              }`}
            >
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-1">{plan.name}</h2>
                <p className="text-zinc-400 text-sm mb-4">{plan.description}</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-zinc-400 mb-1">{plan.period}</span>
                </div>
                <p className="text-zinc-500 text-sm mt-1">{plan.artists}</p>
              </div>
              <ul className="space-y-2 flex-1 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="text-sm text-zinc-300 flex gap-2">
                    <span className="text-green-400">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className={`text-center py-3 rounded-full font-semibold text-sm transition-colors ${
                  plan.highlighted
                    ? "bg-white text-black hover:bg-zinc-200"
                    : "border border-zinc-700 text-zinc-300 hover:border-zinc-500"
                }`}
              >
                Get started
              </Link>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
