import Link from "next/link";
import { ImageOff } from "lucide-react";
import type { CompletedTattooProject } from "../types";

interface Props {
  project: CompletedTattooProject;
}

export default function CompletedProjectCard({ project }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
      <div className="relative aspect-[4/3] bg-zinc-100">
        {project.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.imageUrl}
            alt={project.title}
            className="w-full h-full object-cover"
            style={{ objectPosition: project.objectPosition ?? "center" }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-300">
            <ImageOff size={28} strokeWidth={1.5} />
          </div>
        )}
        <span className="absolute top-2.5 left-2.5 text-[11px] font-medium text-emerald-700 bg-white/90 backdrop-blur px-2.5 py-1 rounded-full">
          Completed
        </span>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-sm font-semibold text-zinc-900 truncate">{project.title}</h3>
        <p className="text-xs text-zinc-500 mt-0.5">{project.style}</p>

        <div className="flex items-center justify-between mt-3 text-xs text-zinc-400">
          <span>{project.artistName}</span>
          <span>{project.completedDateLabel}</span>
        </div>

        {project.priceLabel && (
          <p className="text-sm font-semibold text-zinc-900 mt-2.5">{project.priceLabel}</p>
        )}

        <Link
          href={project.continueHref}
          className="mt-4 text-center text-sm font-semibold text-violet-600 hover:text-violet-700 border border-violet-200 hover:border-violet-300 rounded-xl py-2.5 transition-colors"
        >
          View Project →
        </Link>
      </div>
    </div>
  );
}
