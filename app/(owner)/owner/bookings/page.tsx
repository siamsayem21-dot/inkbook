import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioId } from "@/lib/auth/config";
import Link from "next/link";

export const dynamic = "force-dynamic";

type BookingStatus = "pending_deposit" | "confirmed" | "completed" | "cancelled" | "no_show";

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending_deposit: "Awaiting deposit",
  confirmed:       "Confirmed",
  completed:       "Completed",
  cancelled:       "Cancelled",
  no_show:         "No-show",
};

const STATUS_CLASS: Record<BookingStatus, string> = {
  pending_deposit: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  confirmed:       "bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/20",
  completed:       "bg-green-500/10 text-green-400 border border-green-500/20",
  cancelled:       "bg-white/5 text-white/30 border border-white/10",
  no_show:         "bg-red-500/10 text-red-400 border border-red-500/20",
};

function fmtDate(d: string) {
  const [y, mo, day] = d.split("-").map(Number);
  return new Date(y, mo - 1, day).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function fmtTime(t: string) {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

type DepositBadge = { label: string; cls: string };

function depositBadgeInfo(depositPaid: boolean, hasPending: boolean): DepositBadge {
  if (depositPaid) return {
    label: "Deposit Paid",
    cls: "bg-green-500/10 text-green-400 border-green-500/20",
  };
  if (hasPending) return {
    label: "Deposit Pending",
    cls: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  };
  return {
    label: "No Deposit",
    cls: "bg-white/[0.03] text-zinc-600 border-white/[0.06]",
  };
}

export default async function OwnerBookingsPage() {
  const studioId = await getStudioId();
  if (!studioId) redirect("/login");

  const supabase = createAdminClient();

  const { data: bookingsRaw } = await supabase
    .from("bookings")
    .select("id, date, time, status, deposit_amount_cents, deposit_paid, client_id, artist_id")
    .eq("studio_id", studioId)
    .order("date", { ascending: false });

  const bookings = (bookingsRaw ?? []) as {
    id: string; date: string; time: string;
    status: BookingStatus; deposit_amount_cents: number;
    deposit_paid: boolean;
    client_id: string; artist_id: string;
  }[];

  const bookingIds = bookings.map(b => b.id);
  const clientIds  = Array.from(new Set(bookings.map(b => b.client_id).filter(Boolean)));
  const artistIds  = Array.from(new Set(bookings.map(b => b.artist_id).filter(Boolean)));

  const [{ data: clientsRaw }, { data: artistsRaw }, pendingDpResult] = await Promise.all([
    clientIds.length
      ? supabase.from("clients").select("id, full_name").in("id", clientIds)
      : Promise.resolve({ data: [] }),
    artistIds.length
      ? supabase.from("artists").select("id, name").in("id", artistIds)
      : Promise.resolve({ data: [] }),
    bookingIds.length
      ? (supabase
          .from("deposit_payments" as never)
          .select("booking_id")
          .in("booking_id", bookingIds)
          .eq("payment_status", "pending") as unknown as Promise<{
            data: Array<{ booking_id: string }> | null;
          }>)
      : Promise.resolve({ data: [] as Array<{ booking_id: string }> }),
  ]);

  const clientName = Object.fromEntries(
    (clientsRaw ?? []).map((c: { id: string; full_name: string }) => [c.id, c.full_name])
  );
  const artistName = Object.fromEntries(
    (artistsRaw ?? []).map((a: { id: string; name: string }) => [a.id, a.name])
  );
  const pendingDepositSet = new Set(
    (pendingDpResult.data ?? []).map(d => d.booking_id)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">All Bookings</h1>
        <span className="text-xs bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/20 rounded-full px-2.5 py-1">
          {bookings.length}
        </span>
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
                    <th className="px-5 py-3.5" />
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => {
                    const badge = depositBadgeInfo(b.deposit_paid, pendingDepositSet.has(b.id));
                    return (
                      <tr key={b.id} className="border-b border-[#161616] last:border-0 hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-4 text-[#E8E8E8] font-medium">{clientName[b.client_id] ?? "—"}</td>
                        <td className="px-5 py-4 text-zinc-400">{artistName[b.artist_id] ?? "—"}</td>
                        <td className="px-5 py-4 text-zinc-400">{fmtDate(b.date)}</td>
                        <td className="px-5 py-4 text-zinc-400">{fmtTime(b.time)}</td>
                        <td className="px-5 py-4">
                          <div className="space-y-1.5">
                            <span className="text-[#c9a84c] block text-sm">
                              ${b.deposit_amount_cents != null ? (b.deposit_amount_cents / 100).toFixed(2) : "—"}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border inline-block ${badge.cls}`}>
                              {badge.label}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-xs px-2.5 py-1 rounded-full ${STATUS_CLASS[b.status] ?? "bg-zinc-800 text-zinc-400"}`}>
                            {STATUS_LABEL[b.status] ?? b.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link href={`/owner/bookings/${b.id}`} className="text-xs text-zinc-500 hover:text-white transition-colors">
                            View →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile card stack */}
            <div className="flex flex-col divide-y divide-[#161616] md:hidden">
              {bookings.map(b => {
                const badge = depositBadgeInfo(b.deposit_paid, pendingDepositSet.has(b.id));
                return (
                  <Link key={b.id} href={`/owner/bookings/${b.id}`} className="px-5 py-4 space-y-1.5 block hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[#E8E8E8]">{clientName[b.client_id] ?? "—"}</span>
                      <span className={`text-xs px-2.5 py-1 rounded-full ${STATUS_CLASS[b.status] ?? "bg-zinc-800 text-zinc-400"}`}>
                        {STATUS_LABEL[b.status] ?? b.status}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500 flex flex-wrap gap-3">
                      <span>{artistName[b.artist_id] ?? "—"}</span>
                      <span>·</span>
                      <span>{fmtDate(b.date)} at {fmtTime(b.time)}</span>
                      <span>·</span>
                      <span className="text-[#c9a84c]">
                        ${b.deposit_amount_cents != null ? (b.deposit_amount_cents / 100).toFixed(2) : "—"}
                      </span>
                    </div>
                    <div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border inline-block ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
