export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
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

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();

  const { data: studioData } = await supabase
    .from("studios")
    .select("id, name, subdomain, deposit_amount_cents")
    .eq("owner_id", user.id)
    .single();

  const studio = studioData as {
    id: string;
    name: string;
    subdomain: string;
    deposit_amount_cents: number;
  } | null;

  if (!studio) redirect("/register");

  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  firstOfMonth.setHours(0, 0, 0, 0);
  const sevenDaysOut = new Date();
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
  const sevenDaysStr = sevenDaysOut.toISOString().split("T")[0];

  // Run independent queries in parallel
  const [
    { data: todayRaw },
    { data: allIdsRaw },
    { data: artistsRaw },
    { data: upcomingRaw },
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, status")
      .eq("studio_id", studio.id)
      .eq("date", today),
    supabase
      .from("bookings")
      .select("id")
      .eq("studio_id", studio.id),
    supabase
      .from("artists")
      .select("id")
      .eq("studio_id", studio.id),
    supabase
      .from("bookings")
      .select("id, date, time, style, status, client_id, artist_id")
      .eq("studio_id", studio.id)
      .eq("status", "confirmed")
      .gte("date", today)
      .lte("date", sevenDaysStr)
      .order("date", { ascending: true })
      .order("time", { ascending: true })
      .limit(6),
  ]);

  const todayBookings = (todayRaw ?? []) as { id: string; status: BookingStatus }[];
  const allIds = (allIdsRaw ?? []).map((b) => (b as { id: string }).id);
  const artistCount = (artistsRaw ?? []).length;
  const upcoming = (upcomingRaw ?? []) as {
    id: string;
    date: string;
    time: string;
    style: string;
    status: BookingStatus;
    client_id: string;
    artist_id: string;
  }[];

  // Monthly revenue — requires booking ID list
  let monthlyRevenueCents = 0;
  if (allIds.length > 0) {
    const { data: depositsRaw } = await supabase
      .from("deposits")
      .select("amount_cents")
      .in("booking_id", allIds)
      .eq("status", "paid")
      .gte("paid_at" as never, firstOfMonth.toISOString());

    monthlyRevenueCents = (depositsRaw ?? []).reduce(
      (sum, d) => sum + ((d as { amount_cents: number }).amount_cents ?? 0),
      0
    );
  }

  // Batch-fetch client + artist names for upcoming table
  const clientIds = Array.from(new Set(upcoming.map((b) => b.client_id)));
  const artistIds = Array.from(new Set(upcoming.map((b) => b.artist_id)));

  const [{ data: clientsRaw }, { data: artistNamesRaw }] = await Promise.all([
    clientIds.length > 0
      ? supabase.from("clients").select("id, full_name").in("id", clientIds)
      : Promise.resolve({ data: [] as unknown[] }),
    artistIds.length > 0
      ? supabase.from("artists").select("id, name").in("id", artistIds)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  const clientName = Object.fromEntries(
    (clientsRaw ?? []).map((c) => {
      const r = c as { id: string; full_name: string };
      return [r.id, r.full_name];
    })
  );
  const artistName = Object.fromEntries(
    (artistNamesRaw ?? []).map((a) => {
      const r = a as { id: string; name: string };
      return [r.id, r.name];
    })
  );

  const todayConfirmed = todayBookings.filter((b) => b.status === "confirmed").length;
  const monthlyRevenue = `$${(monthlyRevenueCents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const stats = [
    {
      label: "Bookings today",
      value: String(todayBookings.length),
      sub: `${todayConfirmed} confirmed`,
    },
    {
      label: "Revenue this month",
      value: monthlyRevenue,
      sub: "from deposits paid",
      gold: true,
    },
    {
      label: "Next 7 days",
      value: String(upcoming.length),
      sub: "confirmed appointments",
    },
    {
      label: "Artists",
      value: String(artistCount),
      sub: "on your roster",
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-1">Overview</h1>
        <p className="text-white/40 text-sm">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-12">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-zinc-900 border border-white/10 rounded-2xl p-5"
          >
            <p className="text-white/40 text-xs uppercase tracking-wide mb-3">
              {s.label}
            </p>
            <p className={`text-3xl font-bold mb-1 ${s.gold ? "text-gold" : "text-white"}`}>
              {s.value}
            </p>
            <p className="text-white/30 text-xs">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Upcoming appointments */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Upcoming appointments</h2>
          <Link
            href="/dashboard/bookings"
            className="text-xs text-gold hover:text-gold-light transition-colors"
          >
            All bookings →
          </Link>
        </div>

        {upcoming.length > 0 ? (
          <div className="bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  {["Client", "Artist", "Date & Time", "Style", "Status"].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left text-white/30 text-xs font-medium px-5 py-3.5 uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {upcoming.map((b, i) => (
                  <tr
                    key={b.id}
                    className={i < upcoming.length - 1 ? "border-b border-white/5" : ""}
                  >
                    <td className="px-5 py-4 font-medium">
                      {clientName[b.client_id] ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-white/50">
                      {artistName[b.artist_id] ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-white/50">
                      {new Date(b.date + "T12:00:00").toLocaleDateString(
                        "en-US",
                        { weekday: "short", month: "short", day: "numeric" }
                      )}{" "}
                      · {b.time.slice(0, 5)}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs bg-white/5 text-white/40 px-2.5 py-0.5 rounded-full border border-white/10">
                        {b.style}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full ${STATUS_CLASS[b.status]}`}
                      >
                        {STATUS_LABEL[b.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-white/10 rounded-2xl px-5 py-14 text-center">
            <p className="text-white/40 text-sm mb-2">
              No confirmed appointments in the next 7 days.
            </p>
            {studio.subdomain && (
              <a
                href={`/book/${studio.subdomain}`}
                target="_blank"
                className="text-xs text-gold/60 hover:text-gold transition-colors"
              >
                Share your booking page →
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
