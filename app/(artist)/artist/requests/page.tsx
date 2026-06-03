export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";

type RequestStatus = "pending" | "quoted" | "accepted" | "declined" | "completed";

const STATUS_LABEL: Record<RequestStatus, string> = {
  pending:   "Pending",
  quoted:    "Quoted",
  accepted:  "Accepted",
  declined:  "Declined",
  completed: "Completed",
};

const STATUS_CLASS: Record<RequestStatus, string> = {
  pending:   "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  quoted:    "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  accepted:  "bg-gold/10 text-gold border border-gold/20",
  declined:  "bg-white/5 text-white/30 border border-white/10",
  completed: "bg-green-500/10 text-green-400 border border-green-500/20",
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

  const { data: reqsRaw } = await supabase
    .from("custom_requests" as never)
    .select("id, client_name, placement, size, budget_range, status, created_at")
    .eq("studio_id", artist.studio_id)
    .or(`artist_id.eq.${artist.id},artist_id.is.null`)
    .order("created_at", { ascending: false });

  const requests = (reqsRaw ?? []) as {
    id: string;
    client_name: string;
    placement: string;
    size: string;
    budget_range: string;
    status: RequestStatus;
    created_at: string;
  }[];

  const pending = requests.filter((r) => r.status === "pending");
  const others  = requests.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Custom Requests</h1>
        {pending.length > 0 && (
          <span className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-full px-2.5 py-1">
            {pending.length} pending
          </span>
        )}
      </div>

      {requests.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-6 py-16 text-center">
          <p className="text-zinc-500 text-sm">No custom requests yet.</p>
          <p className="text-zinc-700 text-xs mt-1">Requests submitted through your booking page appear here.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {pending.length > 0 && (
            <section>
              <h2 className="text-xs uppercase tracking-widest text-zinc-500 font-medium mb-3">Needs Review</h2>
              <RequestTable requests={pending} />
            </section>
          )}
          {others.length > 0 && (
            <section>
              <h2 className="text-xs uppercase tracking-widest text-zinc-500 font-medium mb-3">All Requests</h2>
              <RequestTable requests={others} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function RequestTable({ requests }: { requests: ReturnType<typeof Array.prototype.filter> }) {
  const rows = requests as {
    id: string;
    client_name: string;
    placement: string;
    size: string;
    budget_range: string;
    status: RequestStatus;
    created_at: string;
  }[];

  return (
    <div className="bg-[#111] border border-[#1E1E1E] rounded-xl overflow-hidden">
      {/* Desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1E1E1E] text-zinc-500 text-xs uppercase tracking-wider">
              <th className="text-left px-5 py-3.5 font-medium">Client</th>
              <th className="text-left px-5 py-3.5 font-medium">Placement</th>
              <th className="text-left px-5 py-3.5 font-medium">Size</th>
              <th className="text-left px-5 py-3.5 font-medium">Budget</th>
              <th className="text-left px-5 py-3.5 font-medium">Submitted</th>
              <th className="text-left px-5 py-3.5 font-medium">Status</th>
              <th className="px-5 py-3.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-[#161616] last:border-0 hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-4 text-[#E8E8E8] font-medium">{r.client_name}</td>
                <td className="px-5 py-4 text-zinc-400">{r.placement}</td>
                <td className="px-5 py-4 text-zinc-400">{r.size}</td>
                <td className="px-5 py-4 text-zinc-400">{r.budget_range}</td>
                <td className="px-5 py-4 text-zinc-500 text-xs">{fmtDate(r.created_at)}</td>
                <td className="px-5 py-4">
                  <span className={`text-xs px-2.5 py-1 rounded-full ${STATUS_CLASS[r.status] ?? "bg-zinc-800 text-zinc-400"}`}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  <Link href={`/artist/requests/${r.id}`} className="text-xs text-zinc-500 hover:text-white transition-colors">
                    Review →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="flex flex-col divide-y divide-[#161616] md:hidden">
        {rows.map((r) => (
          <Link key={r.id} href={`/artist/requests/${r.id}`} className="px-5 py-4 space-y-1.5 block hover:bg-white/[0.02] transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#E8E8E8]">{r.client_name}</span>
              <span className={`text-xs px-2.5 py-1 rounded-full ${STATUS_CLASS[r.status] ?? "bg-zinc-800 text-zinc-400"}`}>
                {STATUS_LABEL[r.status] ?? r.status}
              </span>
            </div>
            <div className="text-xs text-zinc-500">
              {r.placement} · {r.size} · {r.budget_range}
            </div>
            <div className="text-xs text-zinc-700">{fmtDate(r.created_at)}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
