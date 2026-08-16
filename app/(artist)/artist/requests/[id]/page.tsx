export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";
import QuoteForm from "./QuoteForm";

// Same 6-state mapping as the locked app/(owner)/owner/requests/[id]/page.tsx
// and components/artist/RequestCard.tsx — kept verbatim across all three.
const STATUS_LABELS: Record<string, string> = {
  pending:   "Pending Review",
  quoted:    "Approved — Awaiting Deposit",
  accepted:  "Deposit Paid",
  scheduled: "Scheduled",
  declined:  "Declined",
  completed: "Completed",
};

const STATUS_CLASS: Record<string, string> = {
  pending:   "bg-amber-50 text-amber-700",
  quoted:    "bg-violet-50 text-violet-700",
  accepted:  "bg-emerald-50 text-emerald-700",
  scheduled: "bg-sky-50 text-sky-700",
  declined:  "bg-zinc-100 text-zinc-500",
  completed: "bg-green-50 text-green-700",
};

interface Props {
  params: { id: string };
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-0.5">{label}</p>
      <p className="text-sm text-zinc-700">{value}</p>
    </div>
  );
}

export default async function ArtistRequestDetailPage({ params }: Props) {
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

  // Assigned-to-me OR unassigned only — a request assigned to a different
  // artist at this studio must 404, not leak client PII. This was the real
  // gap found in Artist Requests 1/10 (the old detail page only checked
  // studio_id) — fixed here, matching the list page's own existing filter.
  const { data: reqData } = await supabase
    .from("custom_requests")
    .select(
      "id, studio_id, artist_id, client_name, client_email, client_phone, style, design_description, placement, size, budget_range, preferred_dates, reference_photos, status, quote_amount, quote_message, deposit_amount, artist_note, declined_reason, booking_id, created_at"
    )
    .eq("id", params.id)
    .eq("studio_id", artist.studio_id)
    .or(`artist_id.eq.${artist.id},artist_id.is.null`)
    .maybeSingle();

  if (!reqData) notFound();

  const cr = reqData as {
    id: string;
    artist_id: string | null;
    client_name: string;
    client_email: string;
    client_phone: string;
    style: string | null;
    design_description: string;
    placement: string;
    size: string;
    budget_range: string;
    preferred_dates: string;
    reference_photos: string[];
    status: string;
    quote_amount: number | null;
    quote_message: string | null;
    deposit_amount: number | null;
    artist_note: string | null;
    declined_reason: string | null;
    booking_id: string | null;
    created_at: string;
  };

  return (
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-6 max-w-2xl">
        <Link href="/artist/requests" className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors">
          ← Requests
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">{cr.client_name}</h1>
            <p className="text-zinc-500 text-sm mt-0.5">
              Submitted {fmtDate(cr.created_at)}
              {cr.artist_id === artist.id ? " · Assigned to you" : " · Unassigned"}
            </p>
          </div>
          <span className={`text-xs px-3 py-1.5 rounded-full font-medium shrink-0 ${STATUS_CLASS[cr.status] ?? "bg-zinc-100 text-zinc-500"}`}>
            {STATUS_LABELS[cr.status] ?? cr.status}
          </span>
        </div>

        {cr.status === "quoted" && cr.deposit_amount != null && (
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-5 space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-violet-700">Your Quote</p>
            <p className="text-2xl font-bold text-violet-700">
              ${cr.deposit_amount.toFixed(2)} <span className="text-sm font-normal text-zinc-500">deposit</span>
            </p>
            {cr.artist_note && (
              <p className="text-sm text-zinc-600 border-t border-violet-100 pt-3 mt-3 whitespace-pre-wrap">{cr.artist_note}</p>
            )}
          </div>
        )}

        {(cr.status === "accepted" || cr.status === "scheduled") && cr.deposit_amount != null && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-emerald-700">
              {cr.status === "scheduled" ? "Deposit Paid & Scheduled" : "Deposit Paid"}
            </p>
            <p className="text-sm text-zinc-600">
              {cr.status === "scheduled"
                ? "The client's deposit is paid and the session is on the calendar."
                : "The client's deposit is paid. The studio will schedule the session."}
            </p>
            {cr.booking_id && (
              <Link href={`/artist/bookings/${cr.booking_id}`} className="text-xs text-emerald-700 underline underline-offset-2 mt-1 inline-block">
                View linked booking →
              </Link>
            )}
          </div>
        )}

        {cr.status === "completed" && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5">
            <p className="text-[10px] uppercase tracking-widest text-green-700 mb-1">Session Completed</p>
            {cr.booking_id && (
              <Link href={`/artist/bookings/${cr.booking_id}`} className="text-xs text-green-700 underline underline-offset-2 mt-1 inline-block">
                View linked booking →
              </Link>
            )}
          </div>
        )}

        {cr.status === "declined" && (
          <div className="bg-zinc-100 border border-zinc-200 rounded-xl p-5">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Declined</p>
            {cr.declined_reason && <p className="text-sm text-zinc-600 whitespace-pre-wrap">{cr.declined_reason}</p>}
          </div>
        )}

        <div className="bg-white border border-zinc-200 shadow-sm rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-100">
            <p className="text-[10px] uppercase tracking-widest text-zinc-400">Client Contact</p>
          </div>
          <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Info label="Name" value={cr.client_name} />
            <Info label="Email" value={cr.client_email} />
            <Info label="Phone" value={cr.client_phone} />
          </div>
        </div>

        <div className="bg-white border border-zinc-200 shadow-sm rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-100">
            <p className="text-[10px] uppercase tracking-widest text-zinc-400">Tattoo Request</p>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {cr.style && <Info label="Style" value={cr.style} />}
              <Info label="Placement" value={cr.placement} />
              <Info label="Size" value={cr.size} />
              <Info label="Budget" value={cr.budget_range} />
              {cr.preferred_dates && <Info label="Available" value={cr.preferred_dates} />}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1">Description</p>
              <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">{cr.design_description}</p>
            </div>
            {cr.reference_photos.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2">Reference Photos</p>
                <div className="flex flex-wrap gap-2">
                  {cr.reference_photos.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Reference ${i + 1}`}
                        className="w-20 h-20 object-cover rounded-lg border border-zinc-200 hover:border-violet-300 transition-colors"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <QuoteForm requestId={params.id} currentStatus={cr.status} />
      </div>
    </div>
  );
}
