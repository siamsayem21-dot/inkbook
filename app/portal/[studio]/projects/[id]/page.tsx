export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureClientAccount } from "@/lib/auth/config";
import { getBrand } from "@/lib/brand";
import { getClientProjectDetail } from "@/lib/client-portal/projects";
import { getProjectStatusMeta } from "@/lib/client-portal/project-status";
import ProjectTimeline from "../../_components/ProjectTimeline";
import QuoteActions from "./QuoteActions";

interface Props {
  params: { studio: string; id: string };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function ProjectDetailPage({ params }: Props) {
  const supabase = createAdminClient();
  const { data: studioData } = await supabase
    .from("studios")
    .select("id, name, primary_color")
    .eq("subdomain", params.studio)
    .single();

  const studio = studioData as { id: string; name: string; primary_color: string | null } | null;
  if (!studio) notFound();

  const account = await ensureClientAccount();
  if (!account) notFound();

  const project = await getClientProjectDetail(studio.id, account.id, params.id);
  if (!project) notFound();

  const brand = getBrand(studio.primary_color ?? "#D4AF37");
  const meta = getProjectStatusMeta(project.status);

  return (
    <div className="max-w-2xl">
      <Link
        href={`/portal/${params.studio}/projects`}
        className="text-[10px] uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        ← All Projects
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap mt-4 mb-2">
        <h1 className="font-serif text-2xl md:text-3xl tracking-wide">{project.title}</h1>
        <span className={`text-[10px] px-2 py-0.5 border rounded-full shrink-0 mt-1.5 ${meta.badge}`}>
          {meta.label}
        </span>
      </div>

      <p className="text-zinc-500 text-xs mb-8">
        {project.artistName ? `Artist: ${project.artistName} · ` : ""}Last updated {fmtDate(project.updatedAt)}
      </p>

      <div className="border border-white/[0.08] bg-zinc-900/40 p-5 mb-6">
        <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-3">Project Status</p>
        <ProjectTimeline
          status={project.stage.status}
          quoteAcceptedAt={project.stage.quoteAcceptedAt}
          depositPaidAt={project.stage.depositPaidAt}
          bookingStatus={project.stage.bookingStatus}
          brandColor={brand.full}
        />
      </div>

      {project.status === "quoted" && project.quote && (
        <div className="border border-white/[0.08] bg-zinc-900/40 p-5 mb-6">
          <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-4">Quote</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Quote Amount</p>
              <p className="text-sm text-zinc-200">
                {project.quote.amountDollars != null
                  ? `$${project.quote.amountDollars.toLocaleString()}`
                  : "Pending"}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Estimated Sessions</p>
              <p className="text-sm text-zinc-200">{project.quote.estimatedSessions ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Estimated Duration</p>
              <p className="text-sm text-zinc-200">{project.quote.estimatedDuration || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Quote Created</p>
              <p className="text-sm text-zinc-200">{fmtDate(project.quote.quoteCreatedAt)}</p>
            </div>
          </div>

          {project.quote.artistNotes && (
            <div className="mt-4 pt-4 border-t border-white/[0.06]">
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1.5">Artist Notes</p>
              <p className="text-sm text-zinc-300 leading-relaxed">{project.quote.artistNotes}</p>
            </div>
          )}

          <QuoteActions
            projectId={project.id}
            brandColor={brand.full}
            textOnBrand={brand.textOnBrand}
            initialAcceptedAt={project.quote.acceptedAt}
          />
        </div>
      )}

      <div className="border border-white/[0.08] bg-zinc-900/40 divide-y divide-white/[0.06]">
        <div className="px-6 py-4">
          <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1.5">Description</p>
          <p className="text-sm text-zinc-200 leading-relaxed">{project.tattooDescription}</p>
        </div>
        <div className="px-6 py-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Placement</p>
            <p className="text-sm text-zinc-200">{project.placement}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Size</p>
            <p className="text-sm text-zinc-200">{project.estimatedSize}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Color</p>
            <p className="text-sm text-zinc-200">{project.colorPreference}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Budget</p>
            <p className="text-sm text-zinc-200">{project.budgetRange}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
