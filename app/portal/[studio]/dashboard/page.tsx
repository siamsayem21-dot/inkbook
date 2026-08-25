export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureClientAccount } from "@/lib/auth/config";
import { getBrand } from "@/lib/brand";
import { getLatestSubmittedConsultation } from "@/lib/ai-consultation/session";
import { Sparkles, FolderOpen, History, MessageCircle, Settings, ArrowRight } from "lucide-react";
import ProjectTimeline from "../_components/ProjectTimeline";
import MotionCard from "@/components/ui/MotionCard";
import Magnetic from "@/components/ui/Magnetic";

interface Props {
  params: { studio: string };
}

const SECTIONS = [
  { label: "Projects",  href: "projects",  description: "Track your tattoo projects end to end.", icon: FolderOpen },
  { label: "History",   href: "history",   description: "Past sessions with this studio.",         icon: History },
  { label: "Messages",  href: "messages",  description: "Talk to your artist or the studio.",      icon: MessageCircle },
  { label: "Settings",  href: "settings",  description: "Manage your account.",                    icon: Settings },
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
        <MotionCard className="premium-card hover:shadow-elevation-4 transition-shadow duration-200 mt-8 max-w-md p-5" glowColor={`${brand.full}33`} maxTiltDeg={2.5}>
          <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-3">Your Tattoo Project</p>
          <ProjectTimeline
            status={activeProject.status}
            quoteAcceptedAt={activeProject.quoteAcceptedAt}
            depositPaidAt={activeProject.depositPaidAt}
            bookingStatus={activeProject.bookingStatus}
            brandColor={brand.full}
          />
        </MotionCard>
      )}

      {/* Primary CTA — the one magnetic action on this screen. */}
      <Magnetic strength={10} className="block mt-10 w-full">
        <Link
          href={`/portal/${params.studio}/consultation`}
          className="relative overflow-hidden flex items-center gap-4 rounded-2xl p-5 text-white shadow-[0_16px_36px_-8px_rgba(0,0,0,0.28)] hover:shadow-[0_20px_44px_-8px_rgba(0,0,0,0.34)] transition-shadow"
          style={{ background: `linear-gradient(135deg, ${brand.full}, ${brand.full}CC)` }}
        >
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 blur-2xl pointer-events-none" aria-hidden />
          <div className="relative w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <Sparkles size={20} strokeWidth={2.25} />
          </div>
          <div className="relative flex-1 min-w-0">
            <p className="text-sm font-semibold">Start AI Consultation</p>
            <p className="text-xs opacity-80 mt-0.5">Start a new guided intake.</p>
          </div>
          <ArrowRight size={18} className="relative shrink-0 opacity-90" />
        </Link>
      </Magnetic>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={`/portal/${params.studio}/${section.href}`}
            className="premium-card hover:shadow-elevation-4 transition-shadow duration-200 flex items-start gap-3.5 p-5 group"
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${brand.full}14`, color: brand.full }}
            >
              <section.icon size={17} strokeWidth={2.25} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold mb-1 group-hover:opacity-80" style={{ color: brand.full }}>
                {section.label}
              </p>
              <p className="text-zinc-500 text-xs leading-relaxed">{section.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
