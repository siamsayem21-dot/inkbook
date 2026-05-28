import Link from "next/link";

const sections = [
  { label: "Studio profile", href: "/settings/studio", description: "Name, address, subdomain, logo" },
  { label: "Billing & plan", href: "/settings/billing", description: "Subscription, payment method, invoices" },
];

export default function SettingsPage() {
  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="space-y-3">
        {sections.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-600 transition-colors"
          >
            <div>
              <p className="font-medium">{s.label}</p>
              <p className="text-zinc-400 text-sm">{s.description}</p>
            </div>
            <span className="text-zinc-500">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
