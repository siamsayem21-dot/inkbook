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

  const { data, error } = await supabase
    .from("consultations")
    .select(
      "id, client_name, tattoo_description, placement, estimated_size, " +
      "detected_style, budget_range, status, created_at, " +
      "ai_recommended_price_min, ai_recommended_price_max, " +
      "final_price, final_sessions"
    )
    .eq("studio_id" as never, studioId)
    .order("created_at" as never, { ascending: false });

  // Normalize legacy "converted" status to "completed" for display.
  // Both are terminal closed-won states; "converted" has no pipeline column.
  const consults: CardData[] = ((data ?? []) as CardData[]).map((c) => ({
    ...c,
    status: c.status === "converted" ? "completed" : c.status,
  }));

  // Stage summary
  const stageSummary = PIPELINE_STAGES.map((s) => ({
    ...s,
    count: consults.filter((c) => c.status === s.value).length,
  }));

  const activeCount = consults.filter(
    (c) => !["completed", "lost"].includes(c.status)
  ).length;

  const convertedCount = consults.filter((c) => c.status === "completed").length;

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-zinc-500 text-sm">Failed to load pipeline.</p>
        <p className="text-xs text-zinc-700 mt-2 font-mono">{error.message}</p>
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
            {consults.length} total · {activeCount} active · {convertedCount} completed
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
      {consults.length === 0 ? (
        <div className="bg-[#111] border border-[#1E1E1E] rounded-xl px-6 py-16 text-center">
          <p className="font-cinzel text-base font-semibold tracking-wide mb-2">
            Pipeline Empty
          </p>
          <p className="text-zinc-500 text-sm">
            Send clients to{" "}
            <span className="text-[#D4A853] font-mono text-xs">
              /book/[your-subdomain]/consult
            </span>{" "}
            to start filling your pipeline.
          </p>
        </div>
      ) : (
        <PipelineBoard initialConsults={consults} />
      )}
    </div>
  );
}
