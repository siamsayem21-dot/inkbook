export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getStudioId } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";
import OwnerQuoteForm from "./OwnerQuoteForm";
import CopyLinkButton from "./CopyLinkButton";

interface Props {
  params: { id: string };
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

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

export default async function OwnerRequestDetailPage({ params }: Props) {
  const studioId = await getStudioId();
  if (!studioId) redirect("/login");

  const supabase = createAdminClient();

  const [{ data: reqData }, { data: studioData }] = await Promise.all([
    supabase
      .from("custom_requests")
      .select(
        "id, studio_id, artist_id, client_name, client_email, client_phone, style, design_description, placement, size, budget_range, preferred_dates, reference_photos, status, quote_amount, quote_message, deposit_amount, artist_note, declined_reason, booking_id, created_at"
      )
      .eq("id", params.id)
      .eq("studio_id", studioId)
      .single(),
    supabase
      .from("studios")
      .select("subdomain")
      .eq("id", studioId)
      .single(),
  ]);

  if (!reqData) notFound();

  const subdomain = (studioData as { subdomain: string } | null)?.subdomain ?? "";
  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.inkbook.tech";
  const clientPaymentUrl = `${BASE_URL}/book/${subdomain}/request/${params.id}`;

  const cr = reqData as {
    id: string;
    artist_id: string | null;
    style: string | null;
    client_name: string;
    client_email: string;
    client_phone: string;
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

  let artistName: string | null = null;
  if (cr.artist_id) {
    const { data: a } = await supabase
      .from("artists").select("name").eq("id", cr.artist_id).single();
    artistName = (a as { name: string } | null)?.name ?? null;
  }

  const [{ data: allArtistsRaw }] = await Promise.all([
    supabase.from("artists").select("id, name").eq("studio_id", studioId).order("name"),
  ]);
  const allArtists = (allArtistsRaw ?? []) as { id: string; name: string }[];

  return (
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 max-w-2xl space-y-6">
        <Link href="/owner/requests" className="text-zinc-500 hover:text-zinc-900 text-sm transition-colors">
          ← All Requests
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 mb-1">{cr.client_name}</h1>
            <p className="text-zinc-500 text-sm">
              Submitted {fmtDate(cr.created_at)}
              {artistName ? ` · ${artistName}` : " · Unassigned"}
            </p>
          </div>
          <span className={`text-xs px-3 py-1.5 rounded-full font-medium shrink-0 ${STATUS_CLASS[cr.status] ?? "bg-zinc-100 text-zinc-500"}`}>
            {STATUS_LABELS[cr.status] ?? cr.status}
          </span>
        </div>

        {cr.status === "quoted" && cr.deposit_amount != null && (
          <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5 space-y-4">
            <p className="text-[10px] uppercase tracking-widest text-violet-600">Approved — Awaiting Client Payment</p>
            <p className="text-2xl font-bold text-violet-700">
              ${cr.deposit_amount.toFixed(2)} <span className="text-sm font-normal text-zinc-500">deposit</span>
              {cr.quote_amount != null && (
                <span className="text-sm font-normal text-zinc-400"> · ${cr.quote_amount.toFixed(2)} total</span>
              )}
            </p>
            {cr.artist_note && (
              <p className="text-sm text-zinc-600 border-t border-violet-200 pt-3 whitespace-pre-wrap">{cr.artist_note}</p>
            )}
            <div className="border-t border-violet-200 pt-4">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Client Payment Link</p>
              <CopyLinkButton url={clientPaymentUrl} />
            </div>
          </div>
        )}

        {(cr.status === "accepted" || cr.status === "scheduled") && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4">
            <p className="text-emerald-700 text-sm font-medium">
              {cr.status === "scheduled"
                ? "Deposit paid and appointment scheduled."
                : "Deposit paid — appointment awaiting scheduling."}
            </p>
            {cr.booking_id && (
              <Link href={`/owner/bookings/${cr.booking_id}`} className="text-xs text-emerald-700 underline underline-offset-2 mt-1 inline-block">
                View linked booking →
              </Link>
            )}
          </div>
        )}

        {cr.status === "completed" && (
          <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4">
            <p className="text-green-700 text-sm font-medium">Session completed.</p>
            {cr.booking_id && (
              <Link href={`/owner/bookings/${cr.booking_id}`} className="text-xs text-green-700 underline underline-offset-2 mt-1 inline-block">
                View linked booking →
              </Link>
            )}
          </div>
        )}

        {cr.status === "declined" && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
            <p className="text-[10px] uppercase tracking-widest text-red-600 mb-1">Declined</p>
            {cr.declined_reason && (
              <p className="text-sm text-zinc-700 whitespace-pre-wrap">{cr.declined_reason}</p>
            )}
          </div>
        )}

        {/* Client contact */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5">
          <h2 className="text-[10px] uppercase tracking-widest text-zinc-400 font-medium mb-4">Client Contact</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Info label="Name"  value={cr.client_name} />
            <Info label="Email" value={cr.client_email} />
            <Info label="Phone" value={cr.client_phone} />
          </div>
        </div>

        {/* Design details */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5 space-y-4">
          <h2 className="text-[10px] uppercase tracking-widest text-zinc-400 font-medium">Design Details</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {cr.style          && <Info label="Style"       value={cr.style} />}
            {cr.placement      && <Info label="Placement"   value={cr.placement} />}
            {cr.size           && <Info label="Size"        value={cr.size} />}
            {cr.budget_range   && <Info label="Budget"      value={cr.budget_range} />}
            {cr.preferred_dates && <Info label="Available"  value={cr.preferred_dates} />}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1.5">Description</p>
            <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap">{cr.design_description}</p>
          </div>
          {cr.reference_photos.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2">Reference Photos</p>
              <div className="flex flex-wrap gap-2">
                {cr.reference_photos.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Reference ${i + 1}`}
                      className="w-20 h-20 object-cover rounded-lg border border-zinc-200 hover:border-violet-300 transition-colors"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <OwnerQuoteForm
          requestId={params.id}
          currentStatus={cr.status}
          currentArtistId={cr.artist_id}
          artists={allArtists}
        />
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-0.5">{label}</p>
      <p className="text-zinc-700 text-sm truncate">{value}</p>
    </div>
  );
}
