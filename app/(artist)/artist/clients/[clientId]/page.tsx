export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";

const BOOKING_STATUS_META: Record<string, { label: string; badge: string }> = {
  pending_deposit:   { label: "Awaiting Deposit",  badge: "bg-amber-50 text-amber-700" },
  awaiting_schedule: { label: "Awaiting Schedule", badge: "bg-violet-50 text-violet-700" },
  confirmed:         { label: "Confirmed",         badge: "bg-emerald-50 text-emerald-700" },
  completed:         { label: "Completed",         badge: "bg-green-50 text-green-700" },
  cancelled:         { label: "Cancelled",         badge: "bg-zinc-100 text-zinc-500" },
  no_show:           { label: "No-show",           badge: "bg-red-50 text-red-700" },
};

function fmtDate(d: string | null) {
  if (!d) return "Not yet scheduled";
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

interface Props {
  params: { clientId: string };
}

export default async function ArtistClientDetailPage({ params }: Props) {
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

  // Isolation gate: this artist may only view a client they have at least
  // one real booking with — never studio-wide access to every client the
  // studio has ever served. A colleague's client 404s here exactly the same
  // way an unauthorized ID does; there is no "this client belongs to the
  // studio" fallback.
  const { data: bookingsRaw } = await supabase
    .from("bookings")
    .select("id, date, time, status, style, deposit_amount_cents, total_amount_cents")
    .eq("artist_id", artist.id)
    .eq("client_id", params.clientId)
    .order("date", { ascending: false, nullsFirst: false });

  const bookings = (bookingsRaw ?? []) as {
    id: string; date: string | null; time: string | null; status: string; style: string;
    deposit_amount_cents: number; total_amount_cents: number | null;
  }[];

  if (bookings.length === 0) notFound();

  const { data: clientRaw } = await supabase
    .from("clients")
    .select("id, full_name, email, phone, notes")
    .eq("id", params.clientId)
    .eq("studio_id", artist.studio_id)
    .maybeSingle();

  const client = clientRaw as { id: string; full_name: string; email: string; phone: string; notes: string | null } | null;
  if (!client) notFound();

  const bookingIds = bookings.map((b) => b.id);
  const { data: consentRaw } = await supabase
    .from("consent_forms")
    .select("booking_id, signed_at")
    .in("booking_id", bookingIds);
  const consentByBooking = new Map(((consentRaw ?? []) as { booking_id: string; signed_at: string }[]).map((c) => [c.booking_id, c.signed_at]));

  // Consultations/custom requests have no client_id FK of their own — they
  // carry raw contact info until a deposit converts them into a real
  // booking (see page.tsx's comment). Email match is the same identity
  // signal process_custom_request_deposit already uses to upsert into
  // clients, so it's consistent with how the rest of the app treats "same
  // client," not an invented join.
  const [{ data: consultRaw }, { data: requestsRaw }] = await Promise.all([
    supabase.from("consultations").select("id, status, created_at").eq("artist_id", artist.id).ilike("client_email", client.email),
    supabase.from("custom_requests").select("id, status, created_at").eq("artist_id", artist.id).ilike("client_email", client.email),
  ]);
  const consultations = (consultRaw ?? []) as { id: string; status: string; created_at: string }[];
  const requests = (requestsRaw ?? []) as { id: string; status: string; created_at: string }[];

  return (
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-6 max-w-2xl">
        <Link href="/artist/clients" className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors">
          ← My Clients
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{client.full_name}</h1>
          <p className="text-zinc-500 text-sm mt-0.5">{bookings.length} session{bookings.length !== 1 ? "s" : ""} with you</p>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5">
          <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-3">Contact</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-0.5">Email</p>
              <p className="text-sm text-zinc-700">{client.email}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-0.5">Phone</p>
              <p className="text-sm text-zinc-700">{client.phone}</p>
            </div>
          </div>
          {client.notes && (
            <div className="mt-4 pt-4 border-t border-zinc-100">
              <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1">Studio Notes</p>
              <p className="text-sm text-zinc-600 whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-100">
            <p className="text-[10px] uppercase tracking-widest text-zinc-400">Booking History</p>
          </div>
          <div className="divide-y divide-zinc-50">
            {bookings.map((b) => {
              const meta = BOOKING_STATUS_META[b.status] ?? { label: b.status, badge: "bg-zinc-100 text-zinc-500" };
              const hasConsent = consentByBooking.has(b.id);
              return (
                <Link
                  key={b.id}
                  href={`/artist/bookings/${b.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-zinc-50/60 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-zinc-900 truncate">{b.style}</p>
                    <p className="text-xs text-zinc-400">{fmtDate(b.date)}{b.time ? ` · ${b.time}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {hasConsent && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-sky-50 text-sky-700">Consent signed</span>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${meta.badge}`}>{meta.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {(consultations.length > 0 || requests.length > 0) && (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-zinc-100">
              <p className="text-[10px] uppercase tracking-widest text-zinc-400">Consultations &amp; Requests</p>
            </div>
            <div className="divide-y divide-zinc-50">
              {consultations.map((c) => (
                <Link key={c.id} href={`/artist/consultations/${c.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50/60 transition-colors">
                  <span className="text-sm text-zinc-700">Consultation</span>
                  <span className="text-xs text-zinc-400">{c.status}</span>
                </Link>
              ))}
              {requests.map((r) => (
                <Link key={r.id} href={`/artist/requests/${r.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50/60 transition-colors">
                  <span className="text-sm text-zinc-700">Custom Request</span>
                  <span className="text-xs text-zinc-400">{r.status}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
