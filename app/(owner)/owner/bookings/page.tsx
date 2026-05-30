import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/config";

type BookingStatus = "pending_deposit" | "confirmed" | "completed" | "cancelled" | "no_show";

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending_deposit: "Awaiting deposit",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

const STATUS_CLASS: Record<BookingStatus, string> = {
  pending_deposit: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  confirmed:       "bg-[#D4A853]/10 text-[#D4A853] border border-[#D4A853]/20",
  completed:       "bg-green-500/10 text-green-400 border border-green-500/20",
  cancelled:       "bg-white/5 text-white/30 border border-white/10",
  no_show:         "bg-red-500/10 text-red-400 border border-red-500/20",
};

export default async function OwnerBookingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // SSR client — uses the authenticated user's session + anon key.
  // Works with RLS policies without needing SUPABASE_SERVICE_ROLE_KEY.
  const supabase = createClient();

  // Fetch ALL studios for this owner — with multiple studios in the DB,
  // .limit(1) returns an arbitrary row that may not be the one with bookings.
  const { data: studios, error: studioError } = await supabase
    .from("studios")
    .select("id")
    .eq("owner_id", user.id);

  if (studioError) console.error("[OwnerBookings] studio query failed:", studioError.message);
  if (!studioError && (!studios || studios.length === 0)) redirect("/onboarding");

  const studioIds = (studios ?? []).map((s) => (s as { id: string }).id);

  // Fetch bookings across all owner studios so the right one is always found
  const { data: bookingsRaw, error } = await supabase
    .from("bookings")
    .select("id, date, time, status, deposit_amount, client_id, artist_id")
    .in("studio_id", studioIds)
    .order("date", { ascending: false })
    .limit(200);

  if (error) console.error("[OwnerBookings] query failed:", error.message);

  const bookings = (bookingsRaw ?? []) as {
    id: string;
    date: string;
    time: string;
    status: BookingStatus;
    deposit_amount: number;
    client_id: string;
    artist_id: string;
  }[];

  // Batch-fetch client and artist names
  const clientIds = Array.from(new Set(bookings.map((b) => b.client_id).filter(Boolean)));
  const artistIds = Array.from(new Set(bookings.map((b) => b.artist_id).filter(Boolean)));

  const [{ data: clientsRaw }, { data: artistsRaw }] = await Promise.all([
    clientIds.length > 0
      ? supabase.from("clients").select("id, full_name").in("id", clientIds)
      : Promise.resolve({ data: [] }),
    artistIds.length > 0
      ? supabase.from("artists").select("id, name").in("id", artistIds)
      : Promise.resolve({ data: [] }),
  ]);

  const clientName = Object.fromEntries(
    (clientsRaw ?? []).map((c) => [(c as { id: string; full_name: string }).id, (c as { id: string; full_name: string }).full_name])
  );
  const artistName = Object.fromEntries(
    (artistsRaw ?? []).map((a) => [(a as { id: string; name: string }).id, (a as { id: string; name: string }).name])
  );

  function fmtDate(d: string) {
    const [y, mo, day] = d.split("-").map(Number);
    return new Date(y, mo - 1, day).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  }

  function fmtTime(t: string) {
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">All Bookings</h1>
          <span className="text-xs bg-[#D4A853]/10 text-[#D4A853] border border-[#D4A853]/20 rounded-full px-2.5 py-1">
            {bookings.length}
          </span>
        </div>
      </div>

      <div className="bg-[#111] border border-[#1E1E1E] rounded-xl overflow-hidden">
        {bookings.length === 0 ? (
          <p className="px-6 py-12 text-sm text-zinc-500 text-center">No bookings yet.</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1E1E1E] text-zinc-500 text-xs uppercase tracking-wider">
                    <th className="text-left px-5 py-3.5 font-medium">Client</th>
                    <th className="text-left px-5 py-3.5 font-medium">Artist</th>
                    <th className="text-left px-5 py-3.5 font-medium">Date</th>
                    <th className="text-left px-5 py-3.5 font-medium">Time</th>
                    <th className="text-left px-5 py-3.5 font-medium">Deposit</th>
                    <th className="text-left px-5 py-3.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr
                      key={b.id}
                      className="border-b border-[#161616] last:border-0 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-5 py-4 text-[#E8E8E8] font-medium">
                        {clientName[b.client_id] ?? "—"}
                      </td>
                      <td className="px-5 py-4 text-zinc-400">
                        {artistName[b.artist_id] ?? "—"}
                      </td>
                      <td className="px-5 py-4 text-zinc-400">{fmtDate(b.date)}</td>
                      <td className="px-5 py-4 text-zinc-400">{fmtTime(b.time)}</td>
                      <td className="px-5 py-4 text-[#D4A853]">
                        ${b.deposit_amount ?? "—"}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full ${STATUS_CLASS[b.status] ?? "bg-zinc-800 text-zinc-400"}`}>
                          {STATUS_LABEL[b.status] ?? b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card stack */}
            <div className="flex flex-col divide-y divide-[#161616] md:hidden">
              {bookings.map((b) => (
                <div key={b.id} className="px-5 py-4 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#E8E8E8]">
                      {clientName[b.client_id] ?? "—"}
                    </span>
                    <span className={`text-xs px-2.5 py-1 rounded-full ${STATUS_CLASS[b.status] ?? "bg-zinc-800 text-zinc-400"}`}>
                      {STATUS_LABEL[b.status] ?? b.status}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500 flex gap-3">
                    <span>{artistName[b.artist_id] ?? "—"}</span>
                    <span>·</span>
                    <span>{fmtDate(b.date)} at {fmtTime(b.time)}</span>
                    <span>·</span>
                    <span className="text-[#D4A853]">${b.deposit_amount ?? "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
