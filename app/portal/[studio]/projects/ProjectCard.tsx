import Link from "next/link";
import { getProjectStatusMeta } from "@/lib/client-portal/project-status";
import type { ClientProject } from "@/lib/client-portal/projects";

interface Props {
  studioSlug: string;
  project: ClientProject;
  brandColor: string;
  textOnBrand: string;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ProjectCard({ studioSlug, project, brandColor, textOnBrand }: Props) {
  const meta = getProjectStatusMeta(project.status);

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm hover:border-zinc-300 hover:shadow-elevation-2 transition-all p-5 flex items-start justify-between gap-4 flex-wrap">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-zinc-900 truncate">{project.title}</p>

        <div className="flex items-center gap-2 flex-wrap mt-2.5">
          <span className={`text-[10px] px-2 py-0.5 border rounded-full ${meta.badge}`}>{meta.label}</span>
          {project.artistName && (
            <span className="text-[10px] text-zinc-400">
              Artist: <span className="text-zinc-600">{project.artistName}</span>
            </span>
          )}
        </div>

        <p className="text-[10px] text-zinc-400 mt-2.5">Last updated {fmtDate(project.updatedAt)}</p>
      </div>

      <Link
        href={`/portal/${studioSlug}/projects/${project.id}`}
        className="shrink-0 text-[10px] uppercase tracking-widest font-semibold px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
        style={{ backgroundColor: brandColor, color: textOnBrand }}
      >
        View Project
      </Link>
    </div>
  );
}
