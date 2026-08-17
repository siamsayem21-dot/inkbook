export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtPrice(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
}

export default async function ArtistAgreementsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();

  const { data: artistRaw } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const artist = artistRaw as { id: string } | null;
  if (!artist) redirect("/artist/dashboard");

  const { data: agreementsRaw } = await supabase
    .from("session_agreements")
    .select("id, booking_id, client_id, design_description, placement, agreed_price_cents, signed_at")
    .eq("artist_id", artist.id)
    .order("signed_at", { ascending: false });

  const agreements = (agreementsRaw ?? []) as {
    id: string; booking_id: string; client_id: string; design_description: string;
    placement: string; agreed_price_cents: number; signed_at: string;
  }[];

  const clientIds = Array.from(new Set(agreements.map((a) => a.client_id)));
  const { data: clientsRaw } = clientIds.length
    ? await supabase.from("clients").select("id, full_name").in("id", clientIds)
    : { data: [] };
  const clientNameById = Object.fromEntries(((clientsRaw ?? []) as { id: string; full_name: string }[]).map((c) => [c.id, c.full_name]));

  // Eligible bookings for a new agreement: this artist's own confirmed or
  // completed sessions that don't already have one (booking_id is UNIQUE on
  // session_agreements, so this mirrors that constraint exactly).
  const agreedBookingIds = new Set(agreements.map((a) => a.booking_id));
  const { data: eligibleRaw } = await supabase
    .from("bookings")
    .select("id, date, style, status")
    .eq("artist_id", artist.id)
    .in("status", ["confirmed", "completed"])
    .order("date", { ascending: false });
  const eligibleCount = ((eligibleRaw ?? []) as { id: string }[]).filter((b) => !agreedBookingIds.has(b.id)).length;

  return (
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Session Agreements</h1>
            <p className="text-sm text-zinc-500 mt-1 max-w-lg">
              Signed at the start of each session to lock in scope — protects against last-minute design changes. Once signed, an agreement is a permanent record and can&apos;t be edited.
            </p>
          </div>
          {eligibleCount > 0 && (
            <Link
              href="/artist/agreements/new"
              className="bg-violet-600 hover:bg-violet-700 text-white text-sm px-4 py-2 rounded-xl font-semibold transition-colors shrink-0"
            >
              + New Agreement
            </Link>
          )}
        </div>

        {agreements.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm px-6 py-16 text-center">
            <p className="text-base font-semibold text-zinc-900 mb-2">No session agreements yet</p>
            <p className="text-zinc-500 text-sm">
              {eligibleCount > 0
                ? "You have confirmed or completed sessions ready for an agreement."
                : "Once you have a confirmed session, you can create one here."}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-zinc-400">
                  <th className="text-left px-5 py-3 font-medium">Client</th>
                  <th className="text-left px-5 py-3 font-medium">Design</th>
                  <th className="text-left px-5 py-3 font-medium">Price</th>
                  <th className="text-left px-5 py-3 font-medium">Signed</th>
                  <th className="text-left px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {agreements.map((a) => (
                  <tr key={a.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-zinc-900">{clientNameById[a.client_id] ?? "—"}</td>
                    <td className="px-5 py-3.5 text-zinc-600 max-w-xs truncate">{a.design_description}</td>
                    <td className="px-5 py-3.5 text-zinc-700">{fmtPrice(a.agreed_price_cents)}</td>
                    <td className="px-5 py-3.5 text-zinc-500">{fmtDate(a.signed_at)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <Link href={`/artist/agreements/${a.id}`} className="text-xs text-violet-600 font-medium hover:text-violet-700">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
