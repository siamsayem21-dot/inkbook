export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import AcceptDepositButton from "./AcceptDepositButton";

interface Props {
  params: { studio: string; id: string };
  searchParams: { deposit?: string };
}

const STATUS_LABELS: Record<string, string> = {
  pending:   "Pending Review",
  quoted:    "Quote Sent",
  accepted:  "Accepted — Deposit Paid",
  declined:  "Declined",
  completed: "Completed",
};

export default async function ClientRequestPage({ params, searchParams }: Props) {
  const supabase = createAdminClient();

  const { data: studioData } = await supabase
    .from("studios")
    .select("id, name")
    .eq("subdomain", params.studio)
    .single();

  const studio = studioData as { id: string; name: string } | null;
  if (!studio) notFound();

  const { data: reqData } = await supabase
    .from("custom_requests" as never)
    .select("id, client_name, design_description, placement, size, budget_range, preferred_dates, status, quote_amount, quote_message, deposit_amount, created_at, artist_id")
    .eq("id", params.id)
    .eq("studio_id", studio.id)
    .single();

  if (!reqData) notFound();

  const cr = reqData as {
    id: string;
    client_name: string;
    design_description: string;
    placement: string;
    size: string;
    budget_range: string;
    preferred_dates: string;
    status: string;
    quote_amount: number | null;
    quote_message: string | null;
    deposit_amount: number | null;
    created_at: string;
    artist_id: string | null;
  };

  let artistName: string | null = null;
  if (cr.artist_id) {
    const { data: a } = await supabase
      .from("artists")
      .select("name")
      .eq("id", cr.artist_id)
      .single();
    artistName = (a as { name: string } | null)?.name ?? null;
  }

  const depositPaid = searchParams.deposit === "paid";
  const depositCancelled = searchParams.deposit === "cancelled";

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 md:py-14">
      <Link
        href={`/book/${params.studio}`}
        className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-8"
      >
        ← Back to {studio.name}
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2.5 border border-gold/25 px-4 py-1.5 mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
          <span className="text-[10px] uppercase tracking-widest text-gold/80">Custom Request</span>
        </div>
        <h1 className="font-cinzel text-3xl font-bold tracking-wide mb-1">Your Quote</h1>
        <p className="text-zinc-500 text-sm">
          {studio.name}{artistName ? ` · ${artistName}` : ""}
        </p>
      </div>

      {depositPaid && (
        <div className="mb-6 bg-gold/[0.07] border border-gold/25 rounded-xl px-5 py-4">
          <p className="text-gold font-medium text-sm">
            Deposit paid — your appointment is confirmed! Check your email for details.
          </p>
        </div>
      )}

      {depositCancelled && (
        <div className="mb-6 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm rounded-xl px-5 py-3">
          Payment was cancelled. Your quote is still valid — you can try again below.
        </div>
      )}

      {/* Status badge */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-xs uppercase tracking-widest text-zinc-500">Status</span>
        <span className={`text-xs px-3 py-1 rounded-full border ${
          cr.status === "accepted"  ? "bg-gold/10 text-gold border-gold/20" :
          cr.status === "quoted"    ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
          cr.status === "declined"  ? "bg-red-500/10 text-red-400 border-red-500/20" :
          cr.status === "completed" ? "bg-green-500/10 text-green-400 border-green-500/20" :
          "bg-white/5 text-white/40 border-white/10"
        }`}>
          {STATUS_LABELS[cr.status] ?? cr.status}
        </span>
      </div>

      {/* Quote block */}
      {cr.status === "quoted" && cr.quote_amount != null && (
        <div className="bg-gold/[0.07] border border-gold/25 rounded-xl p-6 mb-6 space-y-4">
          <h2 className="font-cinzel text-lg font-bold">Your Custom Quote</h2>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gold">${cr.quote_amount.toFixed(2)}</span>
            <span className="text-zinc-500 text-sm">total session price</span>
          </div>
          {cr.deposit_amount != null && (
            <p className="text-sm text-zinc-400">
              Deposit to confirm: <strong className="text-white">${cr.deposit_amount.toFixed(2)}</strong>
              {" "}— applied toward your total.
            </p>
          )}
          {cr.quote_message && (
            <div className="border-t border-white/[0.06] pt-4">
              <p className="text-xs uppercase tracking-widest text-zinc-600 mb-1.5">Message from the artist</p>
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{cr.quote_message}</p>
            </div>
          )}
          {cr.deposit_amount != null && (
            <div className="pt-2">
              <AcceptDepositButton
                requestId={params.id}
                studioSlug={params.studio}
                depositAmount={cr.deposit_amount}
              />
            </div>
          )}
        </div>
      )}

      {cr.status === "accepted" && (
        <div className="bg-gold/[0.07] border border-gold/25 rounded-xl p-6 mb-6">
          <p className="font-cinzel text-lg font-bold mb-1">Appointment Confirmed</p>
          <p className="text-sm text-zinc-400">
            Your deposit has been received. The studio will reach out to finalize your session date and time.
          </p>
        </div>
      )}

      {cr.status === "declined" && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 mb-6">
          <p className="font-medium text-red-400 mb-1">Request Declined</p>
          <p className="text-sm text-zinc-500">
            Unfortunately the artist was not able to take this project. Feel free to browse other artists
            or submit a new request.
          </p>
        </div>
      )}

      {cr.status === "pending" && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
          <p className="text-sm text-zinc-400">
            Your request is under review. The artist will send you a quote via email within 2–3 business days.
          </p>
        </div>
      )}

      {/* Request Details */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
        <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-medium">Request Details</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Detail label="Placement" value={cr.placement} />
          <Detail label="Size" value={cr.size} />
          <Detail label="Budget" value={cr.budget_range} />
          <Detail label="Availability" value={cr.preferred_dates} />
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-600 mb-1.5">Design Description</p>
          <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{cr.design_description}</p>
        </div>
      </div>

      <p className="text-xs text-zinc-700 text-center mt-8">
        Questions? Contact {studio.name} directly.
      </p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-zinc-600 mb-0.5">{label}</p>
      <p className="text-white/80">{value}</p>
    </div>
  );
}
