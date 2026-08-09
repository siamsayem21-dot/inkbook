export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioId } from "@/lib/auth/config";
import { LIFECYCLE_ORDER, STAGE_MAP, getStage } from "@/lib/pipeline";
import PipelineBoard, { type CardData } from "./PipelineBoard";

// Kanban column order for this board specifically — the canonical InkBook
// lifecycle (New → Reviewed → Quoted → Deposit Paid → Booked → Completed).
// Deliberately not PIPELINE_STAGES' own array order (kept untouched — it
// still drives the Dashboard's LeadPipelineOverview/stat counting). "lost" is
// intentionally excluded here — it's rendered as a separate archive section,
// not a column on the board.
const BOARD_STAGES = LIFECYCLE_ORDER.map((v) => STAGE_MAP[v]);
const LOST_STAGE = STAGE_MAP.lost;

export default async function PipelinePage() {
  const studioId = await getStudioId();
  if (!studioId) redirect("/login");

  const supabase = createAdminClient();

  const [{ data, error }, { data: crData, error: crError }] = await Promise.all([
    supabase
      .from("consultations")
      .select(
        "id, client_name, tattoo_description, placement, estimated_size, " +
        "detected_style, budget_range, status, created_at, artist_id, " +
        "ai_recommended_price_min, ai_recommended_price_max, " +
        "final_price, final_sessions"
      )
      .eq("studio_id" as never, studioId)
      .order("created_at" as never, { ascending: false }),

    supabase
      .from("custom_requests")
      .select("id, client_name, design_description, placement, size, style, budget_range, status, created_at, artist_id, quote_amount")
      .eq("studio_id", studioId)
      .order("created_at", { ascending: false }),
  ]);

  if (error) {
    return (
      <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
        <div className="p-4 pt-16 md:p-8">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm px-6 py-16 text-center">
            <p className="text-zinc-500 text-sm">Failed to load pipeline.</p>
            <p className="text-xs text-zinc-400 mt-2 font-mono">{error.code}: {error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (crError) {
    console.error("[pipeline] custom_requests query failed:", crError.code, crError.message);
  }

  // Normalize legacy "converted" status to "completed" for display — same
  // normalization getStage() applies everywhere else (Dashboard, Consultations).
  type ConsultRow = {
    id: string; client_name: string; tattoo_description: string; placement: string;
    estimated_size: string; detected_style: string | null; budget_range: string;
    status: string; created_at: string; artist_id: string | null;
    ai_recommended_price_min: number | null; ai_recommended_price_max: number | null;
    final_price: number | null; final_sessions: number | null;
  };
  const consultRows = (data ?? []) as ConsultRow[];
  const consults: CardData[] = consultRows.map((c) => ({
    id:                       c.id,
    client_name:              c.client_name,
    tattoo_description:       c.tattoo_description,
    placement:                c.placement,
    estimated_size:           c.estimated_size,
    detected_style:           c.detected_style,
    budget_range:             c.budget_range,
    status:                   getStage(c.status).value,
    created_at:               c.created_at,
    artist_id:                c.artist_id,
    artist_name:              null, // resolved below
    ai_recommended_price_min: c.ai_recommended_price_min,
    ai_recommended_price_max: c.ai_recommended_price_max,
    final_price:              c.final_price,
    final_sessions:           c.final_sessions,
    source:                   "consultation" as const,
  }));

  // custom_requests use their own, simpler status vocabulary — mapped onto
  // the shared lifecycle. Mirrors CUSTOM_REQUEST_STATUS_MAP in lib/pipeline.ts
  // (used by the owner dashboard) — kept as a local literal map here too
  // since this one targets "new" instead of that map's "new" via "pending"
  // and needs the exact same custom_requests-specific keys/labels.
  const crStatusMap: Record<string, string> = {
    pending:   "new",
    quoted:    "quoted",
    accepted:  "deposit_paid",
    declined:  "lost",
    completed: "completed",
  };
  type CustomRequestRow = {
    id: string; client_name: string; design_description: string;
    placement: string; size: string; style: string | null;
    budget_range: string; status: string; created_at: string;
    artist_id: string | null; quote_amount: number | null;
  };
  const crRows = (crData ?? []) as CustomRequestRow[];
  const crCards: CardData[] = crRows.map((cr) => ({
    id:                        cr.id,
    client_name:               cr.client_name,
    tattoo_description:        cr.design_description,
    placement:                 cr.placement,
    estimated_size:            cr.size,
    detected_style:            cr.style ?? null,
    budget_range:              cr.budget_range,
    status:                    crStatusMap[cr.status] ?? "new",
    created_at:                cr.created_at,
    artist_id:                 cr.artist_id,
    artist_name:               null,
    ai_recommended_price_min:  null,
    ai_recommended_price_max:  null,
    final_price:               cr.quote_amount != null ? Math.round(cr.quote_amount) : null,
    final_sessions:            null,
    source:                    "custom_request" as const,
  }));

  const allCardsRaw = [...consults, ...crCards];

  // Resolve assigned/preferred artist names — both tables only store
  // artist_id, same join pattern used by the Consultations list/dashboard.
  const artistIds = Array.from(
    new Set(allCardsRaw.map((c) => c.artist_id).filter((id): id is string => !!id))
  );
  const { data: artistsRaw } = artistIds.length
    ? await supabase.from("artists").select("id, name").in("id", artistIds)
    : { data: [] as { id: string; name: string }[] };
  const artistName = Object.fromEntries(
    ((artistsRaw ?? []) as { id: string; name: string }[]).map((a) => [a.id, a.name])
  );

  const allCards: CardData[] = allCardsRaw
    .map((c) => ({ ...c, artist_name: c.artist_id ? (artistName[c.artist_id] ?? null) : null }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const boardCards = allCards.filter((c) => c.status !== "lost");
  const lostCards  = allCards.filter((c) => c.status === "lost");

  const stageCounts = Object.fromEntries(
    BOARD_STAGES.map((s) => [s.value, boardCards.filter((c) => c.status === s.value).length])
  );
  const needsActionCount = boardCards.filter((c) => c.status === "new" || c.status === "reviewed").length;
  const activeCount = boardCards.filter((c) => c.status !== "completed").length;
  const completedCount = stageCounts.completed ?? 0;

  return (
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Pipeline</h1>
            <p className="text-sm text-zinc-500 mt-1">
              {allCards.length} total lead{allCards.length === 1 ? "" : "s"} · {activeCount} active · {completedCount} completed · {lostCards.length} lost
              {needsActionCount > 0 && (
                <span className="text-amber-600 font-medium"> · {needsActionCount} need{needsActionCount === 1 ? "s" : ""} action</span>
              )}
            </p>
          </div>
        </div>

        {/* Always render the canonical columns — New through Completed — even
            with zero leads, each showing count 0 rather than being replaced
            by a generic empty state. Lost stays a separate collapsed archive
            (PipelineBoard already only renders that section when non-empty). */}
        <PipelineBoard
          boardStages={BOARD_STAGES}
          lostStage={LOST_STAGE}
          boardCards={boardCards}
          lostCards={lostCards}
          stageCounts={stageCounts}
        />

        {crError && (
          <p className="text-xs text-red-600 font-mono">
            custom_requests query error: {crError.code} — {crError.message}
          </p>
        )}
      </div>
    </div>
  );
}
