export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";
import RequestCard from "@/components/artist/RequestCard";

type RequestRow = {
  id: string;
  client_name: string;
  style: string | null;
  budget_range: string;
  status: string;
  artist_id: string | null;
  created_at: string;
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function ArtistRequestsPage() {
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

  // Assigned-to-me OR unassigned only — never a request assigned to a
  // different artist at this studio. Same filter shape already used here
  // before the redesign; see Artist Requests 1/10 for why the detail page
  // and action routes (fixed in 5/10) needed the identical restriction.
  const { data: reqsRaw } = await supabase
    .from("custom_requests")
    .select("id, client_name, style, budget_range, status, artist_id, created_at")
    .eq("studio_id", artist.studio_id)
    .or(`artist_id.eq.${artist.id},artist_id.is.null`)
    .order("created_at", { ascending: false });

  const requests = (reqsRaw ?? []) as RequestRow[];

  const needsAction = requests.filter((r) => r.status === "pending");
  const inProgress = requests.filter((r) => ["quoted", "accepted", "scheduled"].includes(r.status));
  const completed = requests.filter((r) => r.status === "completed");
  const declined = requests.filter((r) => r.status === "declined");

  const groups = [
    { label: "Needs Action", rows: needsAction },
    { label: "In Progress", rows: inProgress },
    { label: "Completed", rows: completed },
    { label: "Declined", rows: declined },
  ];

  return (
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Custom Requests</h1>
          {needsAction.length > 0 && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
              {needsAction.length} needs action
            </span>
          )}
        </div>
        <p className="text-sm text-zinc-500">
          Requests submitted through your booking page — assigned to you or unassigned.
        </p>

        {requests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm px-6 py-16 text-center">
            <p className="text-base font-semibold text-zinc-900 mb-2">No Requests Yet</p>
            <p className="text-zinc-500 text-sm">Requests submitted through your booking page will show up here.</p>
          </div>
        ) : (
          groups.map(({ label, rows }) =>
            rows.length === 0 ? null : (
              <div key={label}>
                <h2 className="text-sm font-semibold text-zinc-500 mb-3">{label}</h2>
                <div className="space-y-2">
                  {rows.map((r) => (
                    <RequestCard
                      key={r.id}
                      requestId={r.id}
                      clientName={r.client_name}
                      style={r.style}
                      budgetRange={r.budget_range}
                      date={fmtDate(r.created_at)}
                      status={r.status}
                      assignedToMe={r.artist_id === artist.id}
                    />
                  ))}
                </div>
              </div>
            )
          )
        )}
      </div>
    </div>
  );
}
