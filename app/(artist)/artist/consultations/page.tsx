export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStage, type LeadStatus } from "@/lib/pipeline";

// Same definition as app/(owner)/owner/consultations/page.tsx's NEEDS_ACTION —
// a consultation "needs action" when nothing has been reviewed or quoted yet.
const NEEDS_ACTION: ReadonlySet<string> = new Set(["new", "reviewed"]);

const LIGHT_STAGE_BADGE: Record<LeadStatus, string> = {
  new:          "bg-blue-50 text-blue-700",
  reviewed:     "bg-yellow-50 text-yellow-700",
  quoted:       "bg-amber-50 text-amber-700",
  booked:       "bg-emerald-50 text-emerald-700",
  deposit_paid: "bg-violet-50 text-violet-700",
  completed:    "bg-green-50 text-green-700",
  lost:         "bg-zinc-100 text-zinc-500",
};

type ConsultRow = {
  id: string;
  client_name: string;
  client_email: string;
  tattoo_description: string;
  placement: string;
  estimated_size: string;
  budget_range: string;
  detected_style: string | null;
  status: string;
  created_at: string;
  final_price: number | null;
  artist_id: string | null;
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function ArtistConsultationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();

  const { data: artistRaw } = await supabase
    .from("artists")
    .select("id, studio_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const artist = artistRaw as { id: string; studio_id: string } | null;
  if (!artist) redirect("/artist/dashboard");

  // Scoped to this artist's own studio AND (assigned to them OR unclaimed) —
  // a consultation assigned to a different artist must never appear here.
  // Same .or() pattern already used by app/(artist)/artist/requests/page.tsx
  // for the equivalent custom_requests query.
  const { data: rows } = await supabase
    .from("consultations")
    .select(
      "id, client_name, client_email, tattoo_description, placement, " +
      "estimated_size, budget_range, detected_style, status, created_at, " +
      "final_price, artist_id"
    )
    .eq("studio_id", artist.studio_id)
    .or(`artist_id.eq.${artist.id},artist_id.is.null`)
    .order("created_at", { ascending: false });

  const consultations = (rows ?? []) as ConsultRow[];
  const assignedToMe = consultations.filter((c) => c.artist_id === artist.id);
  const needsActionCount = consultations.filter((c) => NEEDS_ACTION.has(c.status)).length;

  return (
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Consultations</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {assignedToMe.length} assigned to you
            {needsActionCount > 0 && (
              <span className="text-amber-600 font-medium"> · {needsActionCount} need{needsActionCount === 1 ? "s" : ""} action</span>
            )}
          </p>
        </div>

        {consultations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm px-6 py-16 text-center">
            <p className="text-base font-semibold text-zinc-900 mb-2">No Consultations Yet</p>
            <p className="text-zinc-500 text-sm">New client consultations for your studio will show up here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {consultations.map((c) => {
              const stage = getStage(c.status);
              const needsAction = NEEDS_ACTION.has(c.status);
              const isMine = c.artist_id === artist.id;
              const assignmentLabel = isMine ? "Assigned to you" : "Unassigned";

              return (
                <Link
                  key={c.id}
                  href={`/artist/consultations/${c.id}`}
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
                      <p className={`text-xs mt-1.5 ${isMine ? "text-violet-600 font-medium" : "text-zinc-400"}`}>
                        {assignmentLabel}
                      </p>
                    </div>

                    <div className="text-right shrink-0 flex flex-col items-end gap-2">
                      <p className="text-xs text-zinc-400">{fmtDate(c.created_at)}</p>
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
