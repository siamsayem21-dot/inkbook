export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureClientAccount } from "@/lib/auth/config";
import ConsentForm from "@/components/booking/ConsentForm";

interface Props {
  params: { studio: string; id: string };
}

// Consent step for the client portal's self-serve deposit flow (Phase C
// Feature 1). Reuses the exact same <ConsentForm> and POST /api/consent-forms
// route the classic /book/[studio]/[artistId]/book/consent page uses — only
// the ownership check (portal's ai_chats -> consultations chain, same as
// continueToDeposit()/acceptQuote() in ../actions.ts) and the post-submit
// redirect differ.
export default async function PortalConsentPage({ params }: Props) {
  const supabase = createAdminClient();

  const { data: studioData } = await supabase
    .from("studios")
    .select("id, subdomain")
    .eq("subdomain", params.studio)
    .single();
  const studio = studioData as { id: string; subdomain: string } | null;
  if (!studio) notFound();

  const account = await ensureClientAccount();
  if (!account) notFound();

  // Ownership proof — identical pattern to acceptQuote()/continueToDeposit().
  const { data: chat } = await supabase
    .from("ai_chats")
    .select("id")
    .eq("studio_id", studio.id)
    .eq("client_account_id", account.id)
    .eq("status", "submitted")
    .eq("consultation_id", params.id)
    .maybeSingle();
  if (!chat) notFound();

  const { data: consultRow } = await supabase
    .from("consultations")
    .select("artist_id, booking_id")
    .eq("id", params.id)
    .maybeSingle();
  const consult = consultRow as { artist_id: string | null; booking_id: string | null } | null;
  if (!consult?.booking_id || !consult.artist_id) notFound();

  const { data: bookingRow } = await supabase
    .from("bookings")
    .select("id, status, deposit_paid")
    .eq("id", consult.booking_id)
    .maybeSingle();
  const booking = bookingRow as { id: string; status: string; deposit_paid: boolean } | null;
  if (!booking) notFound();

  const projectPath = `/portal/${params.studio}/projects/${params.id}`;

  // Consent only makes sense once the deposit is actually paid.
  if (!booking.deposit_paid) redirect(projectPath);

  // Already signed — nothing left to do here.
  const { data: existingConsent } = await supabase
    .from("consent_forms")
    .select("id")
    .eq("booking_id", booking.id)
    .maybeSingle();
  if (existingConsent) redirect(projectPath);

  return (
    <div className="max-w-xl mx-auto">
      <Link
        href={projectPath}
        className="text-[10px] uppercase tracking-widest text-zinc-500 hover:text-zinc-900 transition-colors"
      >
        ← Back to Project
      </Link>

      <div className="mt-4 mb-8">
        <h1 className="font-serif text-2xl md:text-3xl tracking-wide mb-1 text-zinc-900">Sign Consent Form</h1>
        <p className="text-zinc-500 text-sm">Required before your session can be confirmed.</p>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
        <ConsentForm bookingId={booking.id} studioSlug={params.studio} artistId={consult.artist_id} redirectTo={projectPath} />
      </div>
    </div>
  );
}
