export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";
import QuoteForm from "./QuoteForm";

interface Props {
  params: { id: string };
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

const STATUS_LABELS: Record<string, string> = {
  pending:   "Pending Review",
  quoted:    "Quote Sent — Awaiting Client",
  accepted:  "Accepted — Deposit Paid",
  declined:  "Declined",
  completed: "Completed",
};

const STATUS_CLASS: Record<string, string> = {
  pending:   "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  quoted:    "bg-blue-500/10 text-blue-400 border-blue-500/20",
  accepted:  "bg-gold/10 text-gold border-gold/20",
  declined:  "bg-white/5 text-white/30 border-white/10",
  completed: "bg-green-500/10 text-green-400 border-green-500/20",
};

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

  const { data: reqData } = await supabase
    .from("custom_requests")
    .select("id, studio_id, artist_id, client_name, client_email, client_phone, design_description, placement, size, budget_range, preferred_dates, reference_photos, status, quote_amount, quote_message, deposit_amount, created_at")
    .eq("id", params.id)
    .eq("studio_id", artist.studio_id)
    .single();

  if (!reqData) notFound();

  const cr = reqData as {
    id: string;
    studio_id: string;
    artist_id: string | null;
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
    created_at: string;
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/artist/requests" className="text-zinc-500 hover:text-white transition-colors text-sm">
          ← All Requests
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">{cr.client_name}</h1>
          <p className="text-zinc-500 text-sm">Submitted {fmtDate(cr.created_at)}</p>
        </div>
        <span className={`text-xs px-3 py-1.5 rounded-full border shrink-0 ${STATUS_CLASS[cr.status] ?? "bg-zinc-800 text-zinc-400 border-zinc-700"}`}>
          {STATUS_LABELS[cr.status] ?? cr.status}
        </span>
      </div>

      {/* Quote summary (if already quoted) */}
      {cr.status !== "pending" && cr.quote_amount != null && (
        <div className="bg-gold/[0.07] border border-gold/25 rounded-xl p-5">
          <p className="text-xs uppercase tracking-widest text-gold/70 mb-2">Quote Sent</p>
          <p className="text-2xl font-bold text-gold mb-1">${cr.quote_amount.toFixed(2)}</p>
          {cr.deposit_amount != null && (
            <p className="text-sm text-zinc-400">Deposit: ${cr.deposit_amount.toFixed(2)}</p>
          )}
          {cr.quote_message && (
            <p className="text-sm text-zinc-400 mt-2 border-t border-white/[0.06] pt-2">{cr.quote_message}</p>
          )}
        </div>
      )}

      {/* Client Contact */}
      <div className="bg-[#111] border border-[#1E1E1E] rounded-xl p-5">
        <h2 className="text-xs uppercase tracking-widest text-zinc-500 font-medium mb-4">Client Contact</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <Info label="Name" value={cr.client_name} />
          <Info label="Email" value={cr.client_email} />
          <Info label="Phone" value={cr.client_phone} />
        </div>
      </div>

      {/* Design Details */}
      <div className="bg-[#111] border border-[#1E1E1E] rounded-xl p-5 space-y-4">
        <h2 className="text-xs uppercase tracking-widest text-zinc-500 font-medium">Design Details</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Info label="Placement" value={cr.placement} />
          <Info label="Size" value={cr.size} />
          <Info label="Budget" value={cr.budget_range} />
          <Info label="Availability" value={cr.preferred_dates} />
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-600 mb-1.5">Design Description</p>
          <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{cr.design_description}</p>
        </div>
        {cr.reference_photos.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-600 mb-2">Reference Photos</p>
            <div className="flex flex-wrap gap-2">
              {cr.reference_photos.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gold hover:text-gold-light transition-colors underline-offset-2 underline"
                >
                  Reference {i + 1}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quote / Decline form */}
      <QuoteForm requestId={params.id} currentStatus={cr.status} />
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
