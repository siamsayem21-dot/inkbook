export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioId } from "@/lib/auth/config";
import { PIPELINE_STAGES } from "@/lib/pipeline";
import PipelineBoard, { type CardData } from "./PipelineBoard";

export default async function PipelinePage() {
  const studioId = await getStudioId();
  if (!studioId) redirect("/login");

  const supabase = createAdminClient();

  const [{ data, error }, { data: crData, error: crError }] = await Promise.all([
    supabase
      .from("consultations")
      .select(
        "id, client_name, tattoo_description, placement, estimated_size, " +
        "detected_style, budget_range, status, created_at, " +
        "ai_recommended_price_min, ai_recommended_price_max, " +
        "final_price, final_sessions"
      )
      .eq("studio_id" as never, studioId)
      .order("created_at" as never, { ascending: false }),

    supabase
      .from("custom_requests")
      .select("id, client_name, design_description, placement, size, style, budget_range, status, created_at, quote_amount")
      .eq("studio_id", studioId)
      .order("created_at", { ascending: false }),
  ]);

  // Normalize legacy "converted" status to "completed" for display.
  const consults: CardData[] = ((data ?? []) as Omit<CardData, "source">[]).map((c) => ({
    ...c,
    status: c.status === "converted" ? "completed" : c.status,
    source: "consultation" as const,
  }));

  // Map custom_request statuses → pipeline stages
  const crStatusMap: Record<string, string> = {
    pending:   "new",
    quoted:    "quoted",
    accepted:  "deposit_paid",
    declined:  "lost",
    completed: "completed",
  };
  const crCards: CardData[] = ((crData ?? []) as {
    id: string; client_name: string; design_description: string;
    placement: string; size: string; style: string | null;
    budget_range: string; status: string; created_at: string;
    quote_amount: number | null;
  }[]).map((cr) => ({
    id:                        cr.id,
    client_name:               cr.client_name,
    tattoo_description:        cr.design_description,
    placement:                 cr.placement,
    estimated_size:            cr.size,
    detected_style:            cr.style ?? null,
    budget_range:              cr.budget_range,
    status:                    crStatusMap[cr.status] ?? "new",
    created_at:                cr.created_at,
    ai_recommended_price_min:  null,
    ai_recommended_price_max:  null,
    final_price:               cr.quote_amount != null ? Math.round(cr.quote_amount) : null,
    final_sessions:            null,
    source:                    "custom_request" as const,
  }));

  // Merge and sort by created_at descending
  const allCards = [...consults, ...crCards].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Stage summary
  const stageSummary = PIPELINE_STAGES.map((s) => ({
    ...s,
    count: allCards.filter((c) => c.status === s.value).length,
  }));

  const activeCount = allCards.filter(
    (c) => !["completed", "lost"].includes(c.status)
  ).length;

  const convertedCount = allCards.filter((c) => c.status === "completed").length;

  if (crError) {
    console.error("[pipeline] custom_requests query failed:", crError.code, crError.message);
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-zinc-500 text-sm">Failed to load pipeline.</p>
        <p className="text-xs text-red-400 mt-2 font-mono">{error.code}: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-cinzel text-2xl md:text-3xl font-bold tracking-wide">
            Lead Pipeline
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            {allCards.length} total · {activeCount} active · {convertedCount} completed
          </p>
        </div>
      </div>

      {/* Stage summary bar */}
      <div className="hidden md:grid grid-cols-7 gap-2">
        {stageSummary.map((s) => (
          <div
            key={s.value}
            className="bg-[#111] border border-[#1E1E1E] rounded-xl px-3 py-3 text-center"
          >
            <p className="text-xl font-bold text-[#E8E8E8] tabular-nums">{s.count}</p>
            <p className="text-[9px] uppercase tracking-widest text-zinc-600 mt-0.5 truncate">
              {s.short}
            </p>
          </div>
        ))}
      </div>

      {/* Board */}
      {allCards.length === 0 ? (
        <div className="bg-[#111] border border-[#1E1E1E] rounded-xl px-6 py-16 text-center space-y-3">
          <p className="font-cinzel text-base font-semibold tracking-wide">
            Pipeline Empty
          </p>
          <p className="text-zinc-500 text-sm">
            Send clients to{" "}
            <span className="text-[#D4A853] font-mono text-xs">
              /book/[your-subdomain]/consult
            </span>{" "}
            to start filling your pipeline.
          </p>
          {crError && (
            <p className="text-xs text-red-400 font-mono mt-2">
              custom_requests query error: {crError.code} — {crError.message}
            </p>
          )}
          <p className="text-[10px] text-zinc-800 font-mono">
            studio={studioId} · consultations={data?.length ?? 0} · custom_requests={crData?.length ?? 0}
          </p>
        </div>
      ) : (
        <PipelineBoard initialConsults={allCards} />
      )}
    </div>
  );
}
