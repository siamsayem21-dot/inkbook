export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureClientAccount } from "@/lib/auth/config";
import { getClientProjects, getClientProjectDetail, type ClientProjectDetail } from "@/lib/client-portal/projects";
import { deriveProjectStage } from "@/lib/client-portal/project-stage";
import { formatDate, formatDateTime } from "@/lib/utils";
import { HOME_PIPELINE_STAGES } from "../home/_components/PipelineStepper";
import MyTattoosBoard from "./_components/MyTattoosBoard";
import { buildMockActiveProjects, buildMockCompletedProjects } from "./mock-data";
import type { ActiveTattooProject, CompletedTattooProject } from "./types";

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

// Same approximation used on the Home page (see home/page.tsx's own
// STAGE_7_TO_10) — the 7-stage Project Detail timeline mapped onto the
// coarser 10-step display pipeline, kept in sync by hand since it's a
// display-only concern, not a shared source of truth.
const STAGE_7_TO_10 = [0, 1, 3, 4, 6, 7, 9];

export default async function MyTattoosPage({ params }: Props) {
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

  const projects = await getClientProjects(studio.id, account.id);
  const hasRealProjects = projects.length > 0;

  let active: ActiveTattooProject[] = [];
  let completed: CompletedTattooProject[] = [];

  if (hasRealProjects) {
    const details = (
      await Promise.all(projects.map((p) => getClientProjectDetail(studio.id, account.id, p.id)))
    ).filter((d): d is ClientProjectDetail => d !== null);

    // getClientProjectDetail only populates `quote` for status === "quoted"
    // (see lib/client-portal/quote.ts) and doesn't select reference_photos or
    // booking date/time at all — rather than widen that shared function for
    // this page's needs, pull the extra columns locally in two small batched
    // reads.
    const projectIds = details.map((d) => d.id);
    const { data: extraRows } = projectIds.length
      ? await supabase.from("consultations").select("id, reference_photos, final_price").in("id", projectIds)
      : { data: [] as { id: string; reference_photos: string[]; final_price: number | null }[] };
    const extraById = new Map(
      ((extraRows ?? []) as { id: string; reference_photos: string[]; final_price: number | null }[]).map((r) => [r.id, r])
    );

    const bookingIds = details.map((d) => d.bookingId).filter((id): id is string => Boolean(id));
    const { data: bookingRows } = bookingIds.length
      ? await supabase.from("bookings").select("id, date, time").in("id", bookingIds)
      : { data: [] as { id: string; date: string; time: string }[] };
    const bookingById = new Map(((bookingRows ?? []) as { id: string; date: string; time: string }[]).map((b) => [b.id, b]));

    for (const d of details) {
      const extra = extraById.get(d.id);
      const imageUrl = extra?.reference_photos?.[0] ?? null;
      const priceDollars = d.quote?.amountDollars ?? extra?.final_price ?? null;
      const priceLabel = priceDollars != null ? `$${priceDollars.toLocaleString()}` : null;
      const booking = d.bookingId ? bookingById.get(d.bookingId) : null;
      const continueHref = `/client-portal/${params.studio}/my-tattoos/${d.id}`;

      if (COMPLETED_STATUSES.has(d.status)) {
        completed.push({
          id: d.id,
          title: d.title,
          imageUrl,
          artistName: d.artistName ?? "Pending Assignment",
          style: d.colorPreference || d.estimatedSize || "Custom",
          // consultations has no dedicated "completed_at" column — updated_at
          // is used as an approximation, same tradeoff already accepted in
          // lib/client-portal/history.ts.
          completedDateLabel: formatDate(d.updatedAt),
          priceLabel,
          continueHref,
        });
      } else {
        active.push({
          id: d.id,
          title: d.title,
          imageUrl,
          statusLabel: statusLabel(d.status),
          style: d.colorPreference || "Custom",
          placement: d.estimatedSize || d.placement || "Not specified",
          artistName: d.artistName ?? "Pending Assignment",
          currentStageLabel: HOME_PIPELINE_STAGES[STAGE_7_TO_10[deriveProjectStage(d.stage)] ?? 0] ?? "Consultation",
          nextStepLabel: nextStepLabel(d.status),
          priceLabel: priceLabel ?? "Pending Quote",
          appointmentLabel: booking ? formatDateTime(booking.date, booking.time) : null,
          lastUpdatedLabel: formatDate(d.updatedAt),
          continueHref,
        });
      }
    }
  } else {
    active = buildMockActiveProjects(params.studio);
    completed = buildMockCompletedProjects(params.studio);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[28px] leading-tight font-bold text-zinc-900">My Tattoos</h1>
        <p className="text-sm text-zinc-500 mt-1.5">View and manage all your tattoo projects.</p>
      </div>

      <MyTattoosBoard active={active} completed={completed} />
    </div>
  );
}
