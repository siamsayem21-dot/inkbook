export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function fmtPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

interface Props {
  params: { id: string };
}

export default async function AgreementDetailPage({ params }: Props) {
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

  // Isolation gate: an agreement only ever belongs to the one artist who
  // created it (session_agreements has no studio-wide RLS/select policy for
  // artists — "artist can select own", artist_id = my_artist_id() only). A
  // same-studio colleague's agreement 404s exactly like an unauthorized ID.
  const { data: agreementRaw } = await supabase
    .from("session_agreements")
    .select("id, booking_id, client_id, design_description, placement, agreed_price_cents, size_inches, client_signature, signed_at")
    .eq("id", params.id)
    .eq("artist_id", artist.id)
    .maybeSingle();

  if (!agreementRaw) notFound();

  const agreement = agreementRaw as {
    id: string; booking_id: string; client_id: string; design_description: string; placement: string;
    agreed_price_cents: number; size_inches: string | null; client_signature: string; signed_at: string;
  };

  const [{ data: clientRaw }, { data: bookingRaw }] = await Promise.all([
    supabase.from("clients").select("full_name, email").eq("id", agreement.client_id).maybeSingle(),
    supabase.from("bookings").select("date, time, status").eq("id", agreement.booking_id).maybeSingle(),
  ]);

  const client = clientRaw as { full_name: string; email: string } | null;
  const booking = bookingRaw as { date: string | null; time: string | null; status: string } | null;

  return (
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-6 max-w-2xl">
        <Link href="/artist/agreements" className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors">
          ← Session Agreements
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">{client?.full_name ?? "Client"}</h1>
            <p className="text-zinc-500 text-sm mt-0.5">Signed {fmtDateTime(agreement.signed_at)}</p>
          </div>
          <span className="text-xs px-3 py-1.5 rounded-full font-medium shrink-0 bg-emerald-50 text-emerald-700">
            Signed &amp; Locked
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5 space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1">Design Description</p>
            <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">{agreement.design_description}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-0.5">Placement</p>
              <p className="text-sm text-zinc-700">{agreement.placement}</p>
            </div>
            {agreement.size_inches && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-0.5">Size</p>
                <p className="text-sm text-zinc-700">{agreement.size_inches}</p>
              </div>
            )}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-0.5">Agreed Price</p>
              <p className="text-sm text-zinc-700 font-semibold">{fmtPrice(agreement.agreed_price_cents)}</p>
            </div>
          </div>
        </div>

        {booking && (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5">
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2">Linked Session</p>
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-700">
                {booking.date ? new Date(booking.date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "Not yet scheduled"}
                {booking.time ? ` · ${booking.time}` : ""}
              </p>
              <Link href={`/artist/bookings/${agreement.booking_id}`} className="text-xs text-violet-600 font-medium hover:text-violet-700">
                View booking →
              </Link>
            </div>
          </div>
        )}

        <div className="bg-zinc-50 rounded-2xl border border-zinc-200 p-5">
          <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1">Client Signature</p>
          <p className="text-lg font-serif italic text-zinc-800">{agreement.client_signature}</p>
          <p className="text-[11px] text-zinc-400 mt-2">This is a permanent legal record. It cannot be edited or deleted.</p>
        </div>
      </div>
    </div>
  );
}
