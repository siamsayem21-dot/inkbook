export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";
import NewAgreementForm from "./NewAgreementForm";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function NewAgreementPage() {
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

  const [{ data: bookingsRaw }, { data: agreementsRaw }] = await Promise.all([
    supabase.from("bookings").select("id, client_id, date, style").eq("artist_id", artist.id).in("status", ["confirmed", "completed"]).order("date", { ascending: false }),
    supabase.from("session_agreements").select("booking_id").eq("artist_id", artist.id),
  ]);

  const agreedBookingIds = new Set(((agreementsRaw ?? []) as { booking_id: string }[]).map((a) => a.booking_id));
  const bookings = ((bookingsRaw ?? []) as { id: string; client_id: string; date: string | null; style: string }[])
    .filter((b) => !agreedBookingIds.has(b.id));

  const clientIds = Array.from(new Set(bookings.map((b) => b.client_id)));
  const { data: clientsRaw } = clientIds.length
    ? await supabase.from("clients").select("id, full_name").in("id", clientIds)
    : { data: [] };
  const clientNameById = Object.fromEntries(((clientsRaw ?? []) as { id: string; full_name: string }[]).map((c) => [c.id, c.full_name]));

  const options = bookings.map((b) => ({
    id: b.id,
    label: `${clientNameById[b.client_id] ?? "Client"} — ${b.style}${b.date ? ` (${fmtDate(b.date)})` : ""}`,
  }));

  return (
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-6 max-w-2xl">
        <Link href="/artist/agreements" className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors">
          ← Session Agreements
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">New Session Agreement</h1>
          <p className="text-sm text-zinc-500 mt-1">Have the client review and sign before the session starts.</p>
        </div>

        {options.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm px-6 py-12 text-center">
            <p className="text-zinc-500 text-sm">No eligible sessions — every confirmed or completed booking already has an agreement, or you have none yet.</p>
          </div>
        ) : (
          <NewAgreementForm bookingOptions={options} />
        )}
      </div>
    </div>
  );
}
