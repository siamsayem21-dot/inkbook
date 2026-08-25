export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureClientAccount } from "@/lib/auth/config";
import { getBrand } from "@/lib/brand";
import { getLatestSubmittedConsultation } from "@/lib/ai-consultation/session";
import ProjectTimeline from "../_components/ProjectTimeline";
import MotionCard from "@/components/ui/MotionCard";

interface Props {
  params: { studio: string };
}

const SECTIONS = [
  { label: "AI Consultation", href: "consultation", description: "Start a new guided intake." },
  { label: "Projects",        href: "projects",     description: "Track your tattoo projects end to end." },
  { label: "History",         href: "history",      description: "Past sessions with this studio." },
  { label: "Messages",        href: "messages",     description: "Talk to your artist or the studio." },
  { label: "Settings",        href: "settings",     description: "Manage your account." },
];

export default async function ClientDashboardPage({ params }: Props) {
  const supabase = createAdminClient();
  const { data: studioData } = await supabase
    .from("studios")
    .select("id, name, primary_color")
    .eq("subdomain", params.studio)
    .single();

  const studio = studioData as { id: string; name: string; primary_color: string | null } | null;
  if (!studio) notFound();

  const account = await ensureClientAccount();
  const brand = getBrand(studio.primary_color ?? "#D4AF37");
  const activeProject = account ? await getLatestSubmittedConsultation(studio.id, account.id) : null;

  return (
    <div className="max-w-3xl">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Client Portal</p>
      <h1 className="font-serif text-2xl md:text-3xl tracking-wide mb-3 text-zinc-900">Welcome back</h1>
      <p className="text-zinc-500 text-sm leading-relaxed">
        You&apos;re signed in as <span className="text-zinc-900 font-medium">{account?.email}</span> to{" "}
        {studio.name}&apos;s client portal.
      </p>

      {activeProject && (
        <MotionCard className="mt-8 max-w-md" glowColor={`${brand.full}33`}>
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5">
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-3">Your Tattoo Project</p>
            <ProjectTimeline
              status={activeProject.status}
              quoteAcceptedAt={activeProject.quoteAcceptedAt}
              depositPaidAt={activeProject.depositPaidAt}
              bookingStatus={activeProject.bookingStatus}
              brandColor={brand.full}
            />
          </div>
        </MotionCard>
      )}

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={`/portal/${params.studio}/${section.href}`}
            className="bg-white rounded-2xl border border-zinc-200 shadow-sm hover:border-zinc-300 hover:shadow-elevation-2 transition-all p-5 group"
          >
            <p
              className="text-sm font-semibold mb-1.5 group-hover:opacity-80"
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
