export const dynamic = "force-dynamic";

import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { PIPELINE_STAGES, getStage } from "@/lib/pipeline";
import ConsultFilter from "./ConsultFilter";

const STUDIO_ID = "5fe382a1-fee7-4387-b625-4bf7a52b8f45";

type ConsultRow = {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  tattoo_description: string;
  placement: string;
  estimated_size: string;
  color_preference: string;
  budget_range: string;
  detected_style: string | null;
  style_confidence: number | null;
  ai_notes: string | null;
  status: string;
  created_at: string;
  reference_photos: string[];
  final_price: number | null;
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export default async function ConsultationsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();

  let query = supabase
    .from("consultations")
    .select(
      "id, client_name, client_email, client_phone, tattoo_description, " +
      "placement, estimated_size, color_preference, budget_range, " +
      "detected_style, style_confidence, ai_notes, status, created_at, " +
      "reference_photos, final_price"
    )
    .eq("studio_id" as never, STUDIO_ID)
    .order("created_at" as never, { ascending: false });

  if (searchParams.status) {
    query = query.eq("status" as never, searchParams.status);
  }

  const { data: rows, error } = await query;
  const consultations = ((rows ?? []) as ConsultRow[]);

  // Stage counts (always over full dataset — run a separate count query)
  const { data: allRows } = await supabase
    .from("consultations")
    .select("status")
    .eq("studio_id" as never, STUDIO_ID);

  const all = (allRows ?? []) as { status: string }[];
  const stageCounts = Object.fromEntries(
    PIPELINE_STAGES.map((s) => [s.value, all.filter((r) => r.status === s.value).length])
  );
  const total = all.length;

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-zinc-500 text-sm">
          Failed to load consultations. Run the migration first.
        </p>
        <p className="text-xs text-zinc-700 mt-2 font-mono">{error.message}</p>
      </div>
    );
  }

  const activeStatus = searchParams.status ?? "all";
  const activeStage  = activeStatus !== "all" ? getStage(activeStatus) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-cinzel text-2xl md:text-3xl font-bold tracking-wide">
            Consultations
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            {activeStage
              ? `${consultations.length} in ${activeStage.label}`
              : `${total} total leads`}
          </p>
        </div>
        <Link
          href="/owner/pipeline"
          className="text-[10px] uppercase tracking-widest text-zinc-500 hover:text-zinc-300 border border-[#252525] hover:border-zinc-600 px-3 py-1.5 rounded-lg transition-colors shrink-0"
        >
          Pipeline →
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
        {PIPELINE_STAGES.map((s) => (
          <Link
            key={s.value}
            href={`/owner/consultations?status=${s.value}`}
            className={`bg-[#111] border rounded-xl px-2 py-2.5 text-center transition-colors hover:border-zinc-700 ${
              activeStatus === s.value
                ? "border-zinc-600"
                : "border-[#1E1E1E]"
            }`}
          >
            <p
              className={`text-xl font-bold tabular-nums ${
                activeStatus === s.value ? s.text : "text-[#E8E8E8]"
              }`}
            >
              {stageCounts[s.value] ?? 0}
            </p>
            <p className="text-[9px] uppercase tracking-widest text-zinc-600 mt-0.5 truncate">
              {s.short}
            </p>
          </Link>
        ))}
      </div>

      {/* Filters */}
      <ConsultFilter />

      {/* Empty state */}
      {consultations.length === 0 ? (
        <div className="bg-[#111] border border-[#1E1E1E] rounded-xl px-6 py-16 text-center">
          {activeStage ? (
            <>
              <p className="font-cinzel text-base font-semibold tracking-wide mb-2">
                No {activeStage.label} Leads
              </p>
              <p className="text-zinc-500 text-sm">
                No consultations in the {activeStage.label.toLowerCase()} stage yet.
              </p>
            </>
          ) : (
            <>
              <p className="font-cinzel text-base font-semibold tracking-wide mb-2">
                No Consultations Yet
              </p>
              <p className="text-zinc-500 text-sm mb-6">
                Share the link below to start collecting AI-qualified leads.
              </p>
              <p className="text-[10px] uppercase tracking-widest text-zinc-700 mb-2">
                Consultation URL
              </p>
              <code className="text-xs font-mono text-[#D4A853] bg-zinc-900 px-3 py-2 rounded-lg">
                /book/[your-subdomain]/consult
              </code>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {consultations.map((c) => {
            const stage = getStage(c.status);
            return (
              <Link
                key={c.id}
                href={`/owner/consultations/${c.id}`}
                className="block bg-[#111] border border-[#1E1E1E] rounded-xl overflow-hidden hover:border-zinc-700 transition-colors"
              >
                <div className={`h-0.5 ${stage.dot}`} />
                <div className="px-5 py-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap mb-1">
                      <p className="font-semibold text-[#E8E8E8]">{c.client_name}</p>
                      {c.detected_style && (
                        <span className="text-[10px] px-2 py-0.5 bg-[#D4A853]/10 text-[#D4A853] border border-[#D4A853]/20 rounded-full">
                          {c.detected_style}
                        </span>
                      )}
                      <span
                        className={`text-[10px] px-2 py-0.5 border rounded-full ${stage.color}`}
                      >
                        {stage.label}
                      </span>
                      {c.final_price && (
                        <span className="text-[10px] px-2 py-0.5 bg-[#D4A853]/05 text-[#D4A853] border border-[#D4A853]/10 rounded-full font-mono">
                          ${c.final_price.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500">
                      {c.client_email} · {c.placement} · {c.budget_range}
                    </p>
                    <p className="text-sm text-zinc-400 mt-1.5 line-clamp-2 leading-relaxed">
                      {c.tattoo_description}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-zinc-700">{fmtDate(c.created_at)}</p>
                    {c.reference_photos?.length > 0 && (
                      <p className="text-[10px] text-zinc-700 mt-1">
                        {c.reference_photos.length} photo
                        {c.reference_photos.length > 1 ? "s" : ""}
                      </p>
                    )}
                    <p className="text-xs text-[#D4A853] mt-2">View →</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
