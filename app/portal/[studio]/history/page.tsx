export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureClientAccount } from "@/lib/auth/config";
import { getBrand } from "@/lib/brand";
import { getClientHistory } from "@/lib/client-portal/history";
import ProjectHistoryCard from "./ProjectHistoryCard";

interface Props {
  params: { studio: string };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function ClientHistoryPage({ params }: Props) {
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
  const { projects, generalThreads } = account
    ? await getClientHistory(studio.id, account.id)
    : { projects: [], generalThreads: [] };

  return (
    <div className="max-w-3xl">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">Client Portal</p>
      <h1 className="font-serif text-2xl md:text-3xl tracking-wide mb-3">History</h1>
      <p className="text-zinc-400 text-sm leading-relaxed mb-8">
        Review your past sessions, consultations, and completed work with {studio.name}.
      </p>

      {projects.length === 0 && generalThreads.length === 0 ? (
        <div className="border border-white/[0.08] bg-zinc-900/40 px-6 py-16 text-center max-w-lg">
          <h2 className="font-serif text-xl md:text-2xl tracking-wide mb-3">No history yet</h2>
          <p className="text-zinc-500 text-sm leading-relaxed">
            Once you start a project with {studio.name}, its story will show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {projects.length > 0 && (
            <div className="space-y-3">
              {projects.map((project) => (
                <ProjectHistoryCard
                  key={project.id}
                  studioSlug={params.studio}
                  project={project}
                  brandColor={brand.full}
                  textOnBrand={brand.textOnBrand}
                />
              ))}
            </div>
          )}

          {generalThreads.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-3">General Conversations</p>
              <div className="space-y-3">
                {generalThreads.map((thread) => (
                  <Link
                    key={thread.id}
                    href={`/portal/${params.studio}/messages/${thread.id}`}
                    className="border border-white/[0.08] bg-zinc-900/40 hover:border-white/20 transition-colors p-5 flex items-start justify-between gap-4 flex-wrap"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-100">{studio.name}</p>
                      <p className="text-xs text-zinc-500 truncate mt-1.5">{thread.lastMessagePreview ?? "No messages yet"}</p>
                    </div>
                    {thread.lastMessageAt && (
                      <span className="text-[10px] text-zinc-600 shrink-0">{fmtDate(thread.lastMessageAt)}</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
