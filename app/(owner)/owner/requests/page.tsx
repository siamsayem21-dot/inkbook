export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";

const STUDIO_ID = "5fe382a1-fee7-4387-b625-4bf7a52b8f45";

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
  accepted:  "bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/20",
  declined:  "bg-white/5 text-white/30 border border-white/10",
  completed: "bg-green-500/10 text-green-400 border border-green-500/20",
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function OwnerRequestsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();

  const { data: reqsRaw } = await supabase
    .from("custom_requests")
    .select("id, client_name, placement, size, budget_range, status, quote_amount, deposit_amount, artist_id, created_at")
    .eq("studio_id", STUDIO_ID)
    .order("created_at", { ascending: false });

  const requests = (reqsRaw ?? []) as {
    id: string;
    client_name: string;
    placement: string;
    size: string;
    budget_range: string;
    status: RequestStatus;
    quote_amount: number | null;
    deposit_amount: number | null;
    artist_id: string | null;
    created_at: string;
  }[];

  const artistIds = Array.from(new Set(requests.map((r) => r.artist_id).filter(Boolean))) as string[];
  const { data: artistsRaw } = artistIds.length
    ? await supabase.from("artists").select("id, name").in("id", artistIds)
    : { data: [] };

  const artistName = Object.fromEntries(
    ((artistsRaw ?? []) as { id: string; name: string }[]).map((a) => [a.id, a.name])
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Custom Requests</h1>
        <span className="text-xs bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/20 rounded-full px-2.5 py-1">
          {requests.length}
        </span>
      </div>

      <div className="bg-[#111] border border-[#1E1E1E] rounded-xl overflow-hidden">
        {requests.length === 0 ? (
          <p className="px-6 py-12 text-sm text-zinc-500 text-center">No custom requests yet.</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1E1E1E] text-zinc-500 text-xs uppercase tracking-wider">
                    <th className="text-left px-5 py-3.5 font-medium">Client</th>
                    <th className="text-left px-5 py-3.5 font-medium">Artist</th>
                    <th className="text-left px-5 py-3.5 font-medium">Placement / Size</th>
                    <th className="text-left px-5 py-3.5 font-medium">Budget</th>
                    <th className="text-left px-5 py-3.5 font-medium">Quote</th>
                    <th className="text-left px-5 py-3.5 font-medium">Submitted</th>
                    <th className="text-left px-5 py-3.5 font-medium">Status</th>
                    <th className="px-5 py-3.5" />
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id} className="border-b border-[#161616] last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-4 text-[#E8E8E8] font-medium">{r.client_name}</td>
                      <td className="px-5 py-4 text-zinc-400">{r.artist_id ? (artistName[r.artist_id] ?? "—") : "Any"}</td>
                      <td className="px-5 py-4 text-zinc-400">{r.placement} · {r.size}</td>
                      <td className="px-5 py-4 text-zinc-400">{r.budget_range}</td>
                      <td className="px-5 py-4 text-[#c9a84c]">
                        {r.quote_amount != null ? `$${r.quote_amount.toFixed(2)}` : "—"}
                      </td>
                      <td className="px-5 py-4 text-zinc-500 text-xs">{fmtDate(r.created_at)}</td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full ${STATUS_CLASS[r.status] ?? "bg-zinc-800 text-zinc-400"}`}>
                          {STATUS_LABEL[r.status] ?? r.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link href={`/owner/requests/${r.id}`} className="text-xs text-zinc-500 hover:text-white transition-colors">
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="flex flex-col divide-y divide-[#161616] md:hidden">
              {requests.map((r) => (
                <Link key={r.id} href={`/owner/requests/${r.id}`} className="px-5 py-4 space-y-1.5 block hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#E8E8E8]">{r.client_name}</span>
                    <span className={`text-xs px-2.5 py-1 rounded-full ${STATUS_CLASS[r.status] ?? "bg-zinc-800 text-zinc-400"}`}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500 flex gap-2 flex-wrap">
                    <span>{r.placement} · {r.size}</span>
                    <span>·</span>
                    <span>{r.budget_range}</span>
                    {r.quote_amount != null && <><span>·</span><span className="text-[#c9a84c]">${r.quote_amount.toFixed(2)}</span></>}
                  </div>
                  <div className="text-xs text-zinc-700">{fmtDate(r.created_at)}</div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
