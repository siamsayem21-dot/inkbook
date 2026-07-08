export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureClientAccount } from "@/lib/auth/config";
import { getBrand } from "@/lib/brand";

interface Props {
  params: { studio: string };
}

const SECTIONS = [
  { label: "AI Consultation", href: "consultation", description: "Start a new guided intake." },
  { label: "My Bookings",     href: "bookings",     description: "Upcoming appointments & deposits." },
  { label: "History",         href: "history",      description: "Past sessions with this studio." },
  { label: "Messages",        href: "messages",     description: "Talk to your artist or the studio." },
  { label: "Settings",        href: "settings",     description: "Manage your account." },
];

export default async function ClientDashboardPage({ params }: Props) {
  const supabase = createAdminClient();
  const { data: studioData } = await supabase
    .from("studios")
    .select("name, primary_color")
    .eq("subdomain", params.studio)
    .single();

  const studio = studioData as { name: string; primary_color: string | null } | null;
  if (!studio) notFound();

  const account = await ensureClientAccount();
  const brand = getBrand(studio.primary_color ?? "#D4AF37");

  return (
    <div className="max-w-3xl">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">Client Portal</p>
      <h1 className="font-serif text-2xl md:text-3xl tracking-wide mb-3">Welcome back</h1>
      <p className="text-zinc-400 text-sm leading-relaxed">
        You&apos;re signed in as <span className="text-zinc-200 font-medium">{account?.email}</span> to{" "}
        {studio.name}&apos;s client portal.
      </p>

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={`/portal/${params.studio}/${section.href}`}
            className="border border-white/[0.08] bg-zinc-900/40 hover:border-white/20 transition-colors p-5 group"
          >
            <p
              className="text-sm font-semibold mb-1.5 group-hover:opacity-90"
              style={{ color: brand.full }}
            >
              {section.label}
            </p>
            <p className="text-zinc-500 text-xs leading-relaxed">{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
