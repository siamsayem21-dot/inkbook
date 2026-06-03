export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";
import OwnerQuoteForm from "./OwnerQuoteForm";

interface Props {
  params: { id: string };
}

const STUDIO_ID = "5fe382a1-fee7-4387-b625-4bf7a52b8f45";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

const STATUS_LABELS: Record<string, string> = {
  pending:   "Pending Review",
  quoted:    "Approved — Awaiting Deposit",
  accepted:  "Deposit Paid",
  declined:  "Declined",
  completed: "Completed",
};

const STATUS_CLASS: Record<string, string> = {
  pending:   "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  quoted:    "bg-green-500/10 text-green-400 border-green-500/20",
  accepted:  "bg-gold/10 text-gold border-gold/20",
  declined:  "bg-red-500/10 text-red-400 border-red-500/20",
  completed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

export default async function OwnerRequestDetailPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();

  const { data: reqData } = await supabase
    .from("custom_requests")
    .select(
      "id, studio_id, artist_id, client_name, client_email, client_phone, style, design_description, placement, size, budget_range, preferred_dates, reference_photos, status, quote_amount, quote_message, deposit_amount, artist_note, declined_reason, created_at"
    )
    .eq("id", params.id)
    .eq("studio_id", STUDIO_ID)
    .single();

  if (!reqData) notFound();

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
    created_at: string;
  };

  let artistName: string | null = null;
  if (cr.artist_id) {
    const { data: a } = await supabase
      .from("artists").select("name").eq("id", cr.artist_id).single();
    artistName = (a as { name: string } | null)?.name ?? null;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/owner/requests" className="text-zinc-500 hover:text-white transition-colors text-sm">
        ← All Requests
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">{cr.client_name}</h1>
          <p className="text-zinc-500 text-sm">
            Submitted {fmtDate(cr.created_at)}
            {artistName ? ` · ${artistName}` : " · Unassigned"}
          </p>
        </div>
        <span className={`text-xs px-3 py-1.5 rounded-full border shrink-0 ${STATUS_CLASS[cr.status] ?? "bg-zinc-800 text-zinc-400 border-zinc-700"}`}>
          {STATUS_LABELS[cr.status] ?? cr.status}
        </span>
      </div>

      {cr.status === "quoted" && cr.deposit_amount != null && (
        <div className="bg-green-500/[0.06] border border-green-500/20 rounded-xl p-5 space-y-2">
          <p className="text-xs uppercase tracking-widest text-green-400/70">Approved</p>
          <p className="text-2xl font-bold text-green-400">
            ${cr.deposit_amount.toFixed(2)} <span className="text-sm font-normal text-zinc-400">deposit</span>
          </p>
          {cr.artist_note && (
            <p className="text-sm text-zinc-400 border-t border-white/[0.06] pt-3 whitespace-pre-wrap">{cr.artist_note}</p>
          )}
        </div>
      )}

      {cr.status === "accepted" && (
        <div className="bg-gold/[0.07] border border-gold/25 rounded-xl px-5 py-4">
          <p className="text-gold text-sm font-medium">Deposit paid — appointment confirmed.</p>
        </div>
      )}

      {cr.status === "declined" && (
        <div className="bg-red-500/[0.06] border border-red-500/20 rounded-xl p-5">
          <p className="text-xs uppercase tracking-widest text-red-400/70 mb-1">Declined</p>
          {cr.declined_reason && (
            <p className="text-sm text-zinc-300 whitespace-pre-wrap">{cr.declined_reason}</p>
          )}
        </div>
      )}

      {/* Client contact */}
      <div className="bg-[#111] border border-[#1E1E1E] rounded-xl p-5">
        <h2 className="text-xs uppercase tracking-widest text-zinc-500 font-medium mb-4">Client Contact</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Info label="Name"  value={cr.client_name} />
          <Info label="Email" value={cr.client_email} />
          <Info label="Phone" value={cr.client_phone} />
        </div>
      </div>

      {/* Design details */}
      <div className="bg-[#111] border border-[#1E1E1E] rounded-xl p-5 space-y-4">
        <h2 className="text-xs uppercase tracking-widest text-zinc-500 font-medium">Design Details</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {cr.style         && <Info label="Style"       value={cr.style} />}
          {cr.placement     && <Info label="Placement"   value={cr.placement} />}
          {cr.size          && <Info label="Size"        value={cr.size} />}
          {cr.budget_range  && <Info label="Budget"      value={cr.budget_range} />}
          {cr.preferred_dates && <Info label="Available" value={cr.preferred_dates} />}
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-600 mb-1.5">Description</p>
          <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{cr.design_description}</p>
        </div>
        {cr.reference_photos.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-600 mb-2">Reference Photos</p>
            <div className="flex flex-wrap gap-2">
              {cr.reference_photos.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Reference ${i + 1}`}
                    className="w-20 h-20 object-cover rounded-lg border border-zinc-700 hover:border-zinc-500 transition-colors"
                  />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <OwnerQuoteForm requestId={params.id} currentStatus={cr.status} />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-zinc-600 mb-0.5">{label}</p>
      <p className="text-white/80 text-sm">{value}</p>
    </div>
  );
}
