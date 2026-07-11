export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureClientAccount } from "@/lib/auth/config";
import { getBrand } from "@/lib/brand";
import { getClientProjects } from "@/lib/client-portal/projects";
import ProjectCard from "./ProjectCard";

interface Props {
  params: { studio: string };
}

export default async function ProjectsPage({ params }: Props) {
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
  const projects = account ? await getClientProjects(studio.id, account.id) : [];

  return (
    <div className="max-w-3xl">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">Client Portal</p>
      <h1 className="font-serif text-2xl md:text-3xl tracking-wide mb-3">Projects</h1>
      <p className="text-zinc-400 text-sm leading-relaxed mb-8">
        Every tattoo project you&apos;ve started with {studio.name}, from first consultation to finished piece.
      </p>

      {projects.length === 0 ? (
        <div className="border border-white/[0.08] bg-zinc-900/40 px-6 py-16 text-center max-w-lg">
          <h2 className="font-serif text-xl md:text-2xl tracking-wide mb-3">No tattoo projects yet</h2>
          <p className="text-zinc-500 text-sm leading-relaxed mb-8 max-w-sm mx-auto">
            Start an AI consultation to create your first tattoo project.
          </p>
          <Link
            href={`/portal/${params.studio}/consultation`}
            className="inline-block text-[10px] uppercase tracking-widest font-semibold px-6 py-3 transition-opacity hover:opacity-90"
            style={{ backgroundColor: brand.full, color: brand.textOnBrand }}
          >
            Start Consultation
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              studioSlug={params.studio}
              project={project}
              brandColor={brand.full}
              textOnBrand={brand.textOnBrand}
            />
          ))}
        </div>
      )}
    </div>
  );
}
