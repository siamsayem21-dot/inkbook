export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";

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
  confirmed: "bg-gold/10 text-gold border border-gold/20",
  completed: "bg-green-500/10 text-green-400 border border-green-500/20",
  cancelled: "bg-white/5 text-white/30 border border-white/10",
  no_show: "bg-red-500/10 text-red-400 border border-red-500/20",
};

interface Props {
  searchParams: { status?: string };
}

export default async function DashboardBookingsPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();

  const { data: studioData } = await supabase
    .from("studios")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  const studio = studioData as { id: string } | null;
  if (!studio) redirect("/register");

  const statusFilter = searchParams.status as BookingStatus | undefined;

  let query = supabase
    .from("bookings")
    .select("id, date, time, style, status, deposit_amount_cents, client_id, artist_id")
    .eq("studio_id", studio.id)
    .order("date", { ascending: false })
    .order("time", { ascending: false })
    .limit(100);

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data: bookingsRaw } = await query;

  const bookings = (bookingsRaw ?? []) as {
    id: string;
    date: string;
    time: string;
    style: string;
    status: BookingStatus;
    deposit_amount_cents: number;
    client_id: string;
    artist_id: string;
  }[];

  // Batch-fetch names
  const clientIds = Array.from(new Set(bookings.map((b) => b.client_id)));
  const artistIds = Array.from(new Set(bookings.map((b) => b.artist_id)));

  const [{ data: clientsRaw }, { data: artistsRaw }] = await Promise.all([
    clientIds.length > 0
      ? supabase.from("clients").select("id, full_name, phone").in("id", clientIds)
      : Promise.resolve({ data: [] as unknown[] }),
    artistIds.length > 0
      ? supabase.from("artists").select("id, name").in("id", artistIds)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  const clientMap = Object.fromEntries(
    (clientsRaw ?? []).map((c) => {
      const r = c as { id: string; full_name: string; phone: string };
      return [r.id, { name: r.full_name, phone: r.phone }];
    })
  );
  const artistMap = Object.fromEntries(
    (artistsRaw ?? []).map((a) => {
      const r = a as { id: string; name: string };
      return [r.id, r.name];
    })
  );

  const FILTERS: { label: string; value: string }[] = [
    { label: "All", value: "" },
    { label: "Confirmed", value: "confirmed" },
    { label: "Pending deposit", value: "pending_deposit" },
    { label: "Completed", value: "completed" },
    { label: "Cancelled", value: "cancelled" },
    { label: "No-show", value: "no_show" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">Bookings</h1>
        <p className="text-white/40 text-sm">{bookings.length} booking{bookings.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-2 mb-7">
        {FILTERS.map((f) => {
          const active = (statusFilter ?? "") === f.value;
          return (
            <a
              key={f.value}
              href={f.value ? `/dashboard/bookings?status=${f.value}` : "/dashboard/bookings"}
              className={`text-xs px-4 py-1.5 rounded-full border transition-colors ${
                active
                  ? "bg-gold text-black border-gold font-semibold"
                  : "border-white/10 text-white/40 hover:text-white hover:border-white/30"
              }`}
            >
              {f.label}
            </a>
          );
        })}
      </div>

      {/* Table */}
      {bookings.length > 0 ? (
        <div className="bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {["Client", "Artist", "Date & Time", "Style", "Deposit", "Status"].map((h) => (
                  <th
                    key={h}
                    className="text-left text-white/30 text-xs font-medium px-5 py-3.5 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookings.map((b, i) => {
                const client = clientMap[b.client_id];
                return (
                  <tr
                    key={b.id}
                    className={i < bookings.length - 1 ? "border-b border-white/5" : ""}
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium">{client?.name ?? "—"}</p>
                      {client?.phone && (
                        <p className="text-white/30 text-xs mt-0.5">{client.phone}</p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-white/50">
                      {artistMap[b.artist_id] ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-white/50">
                      {new Date(b.date + "T12:00:00").toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                      <br />
                      <span className="text-white/30 text-xs">{b.time.slice(0, 5)}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs bg-white/5 text-white/40 px-2.5 py-0.5 rounded-full border border-white/10">
                        {b.style}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-white/60">
                      ${(b.deposit_amount_cents / 100).toFixed(0)}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full ${STATUS_CLASS[b.status]}`}>
                        {STATUS_LABEL[b.status]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-white/10 rounded-2xl px-5 py-16 text-center">
          <p className="text-white/40 text-sm">
            {statusFilter ? `No ${STATUS_LABEL[statusFilter as BookingStatus]?.toLowerCase()} bookings.` : "No bookings yet."}
          </p>
        </div>
      )}
    </div>
  );
}
