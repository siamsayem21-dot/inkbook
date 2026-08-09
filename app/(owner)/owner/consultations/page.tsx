export const dynamic = "force-dynamic";

import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioId } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { STAGE_MAP, getStage, type LeadStatus } from "@/lib/pipeline";

// Filter/count-strip order — deliberately not PIPELINE_STAGES' own order (which is
// "quoted → booked → deposit_paid → completed", shared with the Pipeline board).
// This mirrors the same local-order override the owner dashboard's
// LeadPipelineOverview already uses for its own display, matching the schema's
// actual chronological flow: quote sent → deposit paid → appointment booked.
const FILTER_ORDER: LeadStatus[] = [
  "new", "reviewed", "quoted", "deposit_paid", "booked", "completed", "lost",
];
const FILTER_STAGES = FILTER_ORDER.map((v) => STAGE_MAP[v]);

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
  artist_id: string | null;
};

// Light-theme counterpart to PIPELINE_STAGES' dark badge classes — same mapping
// already used by app/(owner)/owner/dashboard/_components/RecentConsultations.tsx.
const LIGHT_STAGE_BADGE: Record<LeadStatus, string> = {
  new:          "bg-blue-50 text-blue-700",
  reviewed:     "bg-yellow-50 text-yellow-700",
  quoted:       "bg-amber-50 text-amber-700",
  booked:       "bg-emerald-50 text-emerald-700",
  deposit_paid: "bg-violet-50 text-violet-700",
  completed:    "bg-green-50 text-green-700",
  lost:         "bg-zinc-100 text-zinc-500",
};

// A consultation "needs action" when the owner hasn't moved it past intake yet —
// nothing has been reviewed or quoted, so it's sitting untouched in the inbox.
const NEEDS_ACTION: ReadonlySet<string> = new Set(["new", "reviewed"]);

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
  const studioId = await getStudioId();
  if (!studioId) redirect("/login");

  const supabase = createAdminClient();

  // "converted" is a legacy status value the `consultations` CHECK constraint still
  // allows (supabase/migrations/20260621000001_consultation_booking_link.sql) and
  // that getStage() folds into "completed" for display everywhere else (owner
  // dashboard, /owner/pipeline, client portal). Filtering by the literal value the
  // filter strip was clicked with would silently drop any "converted" row from the
  // "Completed" filter even though its badge renders as Completed — so when the
  // active filter resolves to "completed", match both values instead of inventing
  // a "converted" filter tab that doesn't exist in the schema's intended vocabulary.
  const statusFilter = searchParams.status
    ? searchParams.status === "completed"
      ? ["completed", "converted"]
      : [searchParams.status]
    : null;

  let query = supabase
    .from("consultations")
    .select(
      "id, client_name, client_email, client_phone, tattoo_description, " +
      "placement, estimated_size, color_preference, budget_range, " +
      "detected_style, style_confidence, ai_notes, status, created_at, " +
      "reference_photos, final_price, artist_id"
    )
    .eq("studio_id" as never, studioId)
    .order("created_at" as never, { ascending: false });

  if (statusFilter) {
    query = query.in("status" as never, statusFilter);
  }

  const { data: rows, error } = await query;
  const consultations = ((rows ?? []) as ConsultRow[]);

  // Stage counts — always over the full dataset, independent of the active filter.
  // Counted via getStage() (not a literal status match) so any "converted" row
  // lands in the "Completed" tile instead of vanishing from every count.
  const { data: allRows } = await supabase
    .from("consultations")
    .select("status")
    .eq("studio_id" as never, studioId);

  const all = (allRows ?? []) as { status: string }[];
  const stageCounts = Object.fromEntries(
    FILTER_ORDER.map((v) => [v, all.filter((r) => getStage(r.status).value === v).length])
  );
  const total = all.length;
  const needsActionCount = all.filter((r) => NEEDS_ACTION.has(r.status)).length;

  // Real studio subdomain for the empty-state consultation link — OwnerLayout
  // already redirects to /register if no studio exists, so this should always
  // resolve; the placeholder text is only a fallback for that unreachable case.
  const { data: studioRaw } = await supabase
    .from("studios")
    .select("subdomain")
    .eq("id" as never, studioId)
    .maybeSingle();
  const subdomain = (studioRaw as { subdomain: string } | null)?.subdomain ?? null;

  // Assigned artist names — consultations only store artist_id; join in JS the
  // same way the owner dashboard does (Promise.all avoided here since this is a
  // single dependent lookup, not a set of independent fetches).
  const artistIds = Array.from(
    new Set(consultations.map((c) => c.artist_id).filter((id): id is string => !!id))
  );
  const { data: artistsRaw } = artistIds.length
    ? await supabase.from("artists").select("id, name").in("id" as never, artistIds)
    : { data: [] as { id: string; name: string }[] };
  const artistName = Object.fromEntries(
    ((artistsRaw ?? []) as { id: string; name: string }[]).map((a) => [a.id, a.name])
  );

  if (error) {
    return (
      <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
        <div className="p-4 pt-16 md:p-8">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm px-6 py-16 text-center">
            <p className="text-zinc-500 text-sm">Failed to load consultations.</p>
            <p className="text-xs text-zinc-400 mt-2 font-mono">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  const activeStatus = searchParams.status ?? "all";
  const activeStage  = activeStatus !== "all" ? getStage(activeStatus) : null;

  return (
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Consultations</h1>
            <p className="text-sm text-zinc-500 mt-1">
              {activeStage
                ? `${consultations.length} in ${activeStage.label}`
                : `${total} consultation${total === 1 ? "" : "s"}`}
              {needsActionCount > 0 && (
                <span className="text-amber-600 font-medium"> · {needsActionCount} need{needsActionCount === 1 ? "s" : ""} action</span>
              )}
            </p>
          </div>
          <Link
            href="/owner/pipeline"
            className="text-xs font-medium text-violet-600 hover:text-violet-700 border border-zinc-200 hover:border-violet-200 bg-white px-3.5 py-2 rounded-lg transition-colors shrink-0"
          >
            Full pipeline →
          </Link>
        </div>

        {/* Filter / status overview — doubles as the filter control and an at-a-glance count of every stage */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 sm:p-5">
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            <Link
              href="/owner/consultations"
              className={`shrink-0 rounded-xl border px-3.5 py-2.5 text-center min-w-[76px] transition-colors ${
                activeStatus === "all" ? "border-violet-200 bg-violet-50" : "border-zinc-100 hover:border-zinc-200"
              }`}
            >
              <p className={`text-lg font-bold tabular-nums ${activeStatus === "all" ? "text-violet-700" : "text-zinc-900"}`}>{total}</p>
              <p className="text-[9px] uppercase tracking-widest text-zinc-400 mt-0.5">All</p>
            </Link>
            {FILTER_STAGES.map((s) => (
              <Link
                key={s.value}
                href={`/owner/consultations?status=${s.value}`}
                className={`shrink-0 rounded-xl border px-3.5 py-2.5 text-center min-w-[88px] transition-colors ${
                  activeStatus === s.value ? "border-violet-200 bg-violet-50" : "border-zinc-100 hover:border-zinc-200"
                }`}
              >
                <p className={`text-lg font-bold tabular-nums ${activeStatus === s.value ? "text-violet-700" : "text-zinc-900"}`}>
                  {stageCounts[s.value] ?? 0}
                </p>
                <p className="text-[9px] uppercase tracking-widest text-zinc-400 mt-0.5 truncate">{s.label}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Empty state */}
        {consultations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm px-6 py-16 text-center">
            {activeStage ? (
              <>
                <p className="text-base font-semibold text-zinc-900 mb-2">No {activeStage.label} Consultations</p>
                <p className="text-zinc-500 text-sm">No consultations in the {activeStage.label.toLowerCase()} stage yet.</p>
              </>
            ) : (
              <>
                <p className="text-base font-semibold text-zinc-900 mb-2">No Consultations Yet</p>
                <p className="text-zinc-500 text-sm mb-6">Share the link below to start collecting AI-qualified leads.</p>
                <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2">Consultation URL</p>
                {subdomain ? (
                  <code className="text-xs font-mono text-violet-700 bg-violet-50 px-3 py-2 rounded-lg">
                    inkbook.tech/book/{subdomain}/consult
                  </code>
                ) : (
                  <p className="text-xs text-zinc-400">
                    Set your studio subdomain in Settings to get your consultation link.
                  </p>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {consultations.map((c) => {
              const stage = getStage(c.status);
              const needsAction = NEEDS_ACTION.has(c.status);
              const assignedArtist = c.artist_id ? artistName[c.artist_id] : null;
              return (
                <Link
                  key={c.id}
                  href={`/owner/consultations/${c.id}`}
                  className={`block bg-white rounded-2xl border shadow-sm overflow-hidden hover:border-violet-200 transition-colors ${
                    needsAction ? "border-amber-200" : "border-zinc-200"
                  }`}
                >
                  <div className="px-5 py-4 flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <p className="font-semibold text-zinc-900">{c.client_name}</p>
                        {needsAction && (
                          <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Needs action
                          </span>
                        )}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${LIGHT_STAGE_BADGE[stage.value]}`}>
                          {stage.label}
                        </span>
                        {c.detected_style && (
                          <span className="text-[10px] px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-full">
                            {c.detected_style}
                          </span>
                        )}
                        {c.final_price && (
                          <span className="text-[10px] px-2 py-0.5 bg-green-50 text-green-700 rounded-full font-mono">
                            ${c.final_price.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500">
                        {c.client_email} · {c.placement} · {c.estimated_size} · {c.budget_range}
                      </p>
                      <p className="text-sm text-zinc-600 mt-1.5 line-clamp-2 leading-relaxed">
                        {c.tattoo_description}
                      </p>
                      <p className="text-xs text-zinc-400 mt-1.5">
                        {assignedArtist ? `Assigned to ${assignedArtist}` : "Not yet assigned"}
                      </p>
                    </div>

                    <div className="text-right shrink-0 flex flex-col items-end gap-2">
                      <p className="text-xs text-zinc-400">{fmtDate(c.created_at)}</p>
                      {c.reference_photos?.length > 0 && (
                        <div className="flex -space-x-2">
                          {c.reference_photos.slice(0, 3).map((url, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={i}
                              src={url}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
                            />
                          ))}
                          {c.reference_photos.length > 3 && (
                            <div className="w-8 h-8 rounded-full bg-zinc-100 border-2 border-white flex items-center justify-center text-[9px] font-medium text-zinc-500">
                              +{c.reference_photos.length - 3}
                            </div>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-violet-600 font-medium">View →</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
