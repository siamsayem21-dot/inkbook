export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureClientAccount } from "@/lib/auth/config";
import { getClientProjects, getClientProjectDetail } from "@/lib/client-portal/projects";
import { deriveProjectStage } from "@/lib/client-portal/project-stage";
import { formatDate } from "@/lib/utils";
import PipelineStepper from "./_components/PipelineStepper";
import MyTattoosCard from "./_components/MyTattoosCard";
import CurrentProjectCard from "./_components/CurrentProjectCard";
import AIConsultationCard from "./_components/AIConsultationCard";
import FeaturedFlashDesigns, { type FlashDesignItem } from "./_components/FeaturedFlashDesigns";
import RecentActivity from "./_components/RecentActivity";
import {
  MOCK_CURRENT_PROJECT,
  MOCK_PAST_TATTOOS_COUNT,
  MOCK_CHAT_SEED,
  MOCK_FLASH_DESIGNS,
  MOCK_RECENT_ACTIVITY,
} from "./mock-data";

interface Props {
  params: { studio: string };
}

const COMPLETED_STATUSES = new Set(["completed", "converted"]);

function statusLabel(status: string): string {
  if (COMPLETED_STATUSES.has(status)) return "Completed";
  if (status === "lost") return "Declined";
  return "In Progress";
}

function nextStepLabel(status: string): string {
  switch (status) {
    case "new": return "Awaiting Review";
    case "reviewed": return "Quote In Progress";
    case "quoted": return "Quote Review";
    case "deposit_paid": return "Schedule Appointment";
    case "booked": return "Prepare for Session";
    case "completed":
    case "converted": return "Leave a Review";
    case "lost": return "—";
    default: return "Awaiting Review";
  }
}

// Approximate mapping from the 7-stage Project Detail timeline
// (lib/client-portal/project-stage.ts) onto the coarser 10-step Home banner
// (PipelineStepper.HOME_PIPELINE_STAGES). The two aren't 1:1 — this is a
// display-only approximation, not a new source of truth.
const STAGE_7_TO_10 = [0, 1, 3, 4, 6, 7, 9];

export default async function ClientPortalHomePage({ params }: Props) {
  const supabase = createAdminClient();
  const { data: studioData } = await supabase
    .from("studios")
    .select("id, name")
    .eq("subdomain", params.studio)
    .single();

  const studio = studioData as { id: string; name: string } | null;
  if (!studio) notFound();

  const account = await ensureClientAccount();
  if (!account) notFound();

  const { data: nameRow } = await supabase
    .from("client_accounts")
    .select("name")
    .eq("id", account.id)
    .maybeSingle();
  const clientName = (nameRow as { name: string | null } | null)?.name || account.email.split("@")[0];

  const projects = await getClientProjects(studio.id, account.id);
  const pastTattoosCount = projects.filter((p) => COMPLETED_STATUSES.has(p.status)).length;

  const hasRealProject = projects.length > 0;
  const latestDetail = hasRealProject
    ? await getClientProjectDetail(studio.id, account.id, projects[0]!.id)
    : null;

  const currentProject = latestDetail
    ? {
        title: latestDetail.title,
        status: statusLabel(latestDetail.status),
        subtitle: [latestDetail.estimatedSize, latestDetail.colorPreference].filter(Boolean).join(" • ") || "Details pending",
        rows: [
          { label: "Artist", value: latestDetail.artistName ?? "Pending Assignment" },
          { label: "Next Step", value: nextStepLabel(latestDetail.status) },
          { label: "Est. Price", value: latestDetail.quote?.amountDollars != null ? `$${latestDetail.quote.amountDollars.toLocaleString()}` : "Pending Quote" },
          { label: "Last Updated", value: formatDate(latestDetail.updatedAt) },
        ],
        continueHref: `/portal/${params.studio}/projects/${latestDetail.id}`,
        pipelineIndex: STAGE_7_TO_10[deriveProjectStage(latestDetail.stage)] ?? 0,
      }
    : {
        title: MOCK_CURRENT_PROJECT.title,
        status: "In Progress",
        subtitle: `${MOCK_CURRENT_PROJECT.size} • ${MOCK_CURRENT_PROJECT.style}`,
        rows: [
          { label: "Artist", value: MOCK_CURRENT_PROJECT.artistStatus },
          { label: "Next Step", value: MOCK_CURRENT_PROJECT.nextStep },
          { label: "Est. Price", value: MOCK_CURRENT_PROJECT.priceRange },
          { label: "Last Updated", value: MOCK_CURRENT_PROJECT.lastUpdated },
        ],
        continueHref: null,
        pipelineIndex: 3, // "Quote" — matches the reference design's demo state
      };

  const { data: flashRows } = await supabase
    .from("flash_designs")
    .select("id, title, category, image_url")
    .eq("studio_id", studio.id)
    .eq("is_available", true)
    .limit(3);

  const realFlash = (flashRows ?? []) as { id: string; title: string; category: string | null; image_url: string }[];
  const flashDesigns: FlashDesignItem[] = realFlash.length > 0
    ? realFlash.map((f) => ({ id: f.id, title: f.title, category: f.category ?? "Flash", imageUrl: f.image_url }))
    : MOCK_FLASH_DESIGNS;

  // Shared with the bottom row so its cards line up under the same columns.
  const gridCols = "lg:grid-cols-[340px_1fr_360px]";

  return (
    <div className="space-y-6">
      <PipelineStepper currentIndex={currentProject.pipelineIndex} />

      <div className={`grid grid-cols-1 ${gridCols} gap-6 items-stretch`}>
        <MyTattoosCard
          currentProjectTitle={currentProject.title}
          currentProjectStatus={currentProject.status}
          pastTattoosCount={hasRealProject ? pastTattoosCount : MOCK_PAST_TATTOOS_COUNT}
        />

        <div className="min-h-[640px]">
          <AIConsultationCard seedMessages={MOCK_CHAT_SEED} clientName={clientName} studioSlug={params.studio} />
        </div>

        <CurrentProjectCard
          status={currentProject.status}
          title={currentProject.title}
          subtitle={currentProject.subtitle}
          rows={currentProject.rows}
          continueHref={currentProject.continueHref}
        />
      </div>

      <div className={`grid grid-cols-1 ${gridCols} gap-6`}>
        <div className="lg:col-span-2">
          <FeaturedFlashDesigns designs={flashDesigns} />
        </div>
        <RecentActivity items={MOCK_RECENT_ACTIVITY} />
      </div>
    </div>
  );
}
