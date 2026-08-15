import Link from "next/link";

const sections = [
  { label: "Studio profile", href: "/owner/settings/studio", description: "Name, address, subdomain, logo" },
  { label: "Billing & plan", href: "/owner/settings/billing", description: "Subscription, payment method, invoices" },
];

export default function SettingsPage() {
  return (
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-6 max-w-xl">
        <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Settings</h1>
        <div className="space-y-3">
          {sections.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              className="flex items-center justify-between bg-white rounded-2xl border border-zinc-200 shadow-sm p-5 hover:border-violet-200 transition-colors"
            >
              <div>
                <p className="font-medium text-zinc-900">{s.label}</p>
                <p className="text-zinc-500 text-sm">{s.description}</p>
              </div>
              <span className="text-violet-600">→</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
