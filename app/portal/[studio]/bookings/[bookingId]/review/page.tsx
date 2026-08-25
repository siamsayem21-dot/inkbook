export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureClientAccount } from "@/lib/auth/config";
import ReviewForm from "./ReviewForm";

interface Props {
  params: { studio: string; bookingId: string };
}

// Review submission page for a completed booking (Phase C Feature 5). Same
// ownership-proof pattern as the portal consent page
// (app/portal/[studio]/projects/[id]/consent/page.tsx): a submitted ai_chats
// row linking this client account to a consultation whose booking_id
// matches — never trusts the bookingId route param on its own.
export default async function LeaveReviewPage({ params }: Props) {
  const supabase = createAdminClient();

  const { data: studioData } = await supabase
    .from("studios")
    .select("id")
    .eq("subdomain", params.studio)
    .single();
  const studio = studioData as { id: string } | null;
  if (!studio) notFound();

  const account = await ensureClientAccount();
  if (!account) notFound();

  const { data: chatRows } = await supabase
    .from("ai_chats")
    .select("consultation_id")
    .eq("studio_id", studio.id)
    .eq("client_account_id", account.id)
    .eq("status", "submitted")
    .not("consultation_id", "is", null);

  const consultationIds = Array.from(
    new Set(
      ((chatRows ?? []) as { consultation_id: string | null }[])
        .map((r) => r.consultation_id)
        .filter((id): id is string => Boolean(id))
    )
  );
  if (consultationIds.length === 0) notFound();

  const { data: consultRow } = await supabase
    .from("consultations")
    .select("id")
    .in("id", consultationIds)
    .eq("booking_id", params.bookingId)
    .maybeSingle();
  if (!consultRow) notFound();

  const { data: bookingRow } = await supabase
    .from("bookings")
    .select("status")
    .eq("id", params.bookingId)
    .maybeSingle();
  const booking = bookingRow as { status: string } | null;
  if (!booking) notFound();

  const bookingPath = `/portal/${params.studio}/bookings/${params.bookingId}`;

  // Not eligible yet — nothing to review before the session is completed.
  if (booking.status !== "completed") redirect(bookingPath);

  // Already reviewed — one per booking (reviews_booking_id_unique).
  const { data: existingReview } = await supabase
    .from("reviews")
    .select("id")
    .eq("booking_id", params.bookingId)
    .maybeSingle();
  if (existingReview) redirect(bookingPath);

  return (
    <div className="max-w-xl mx-auto">
      <Link
        href={bookingPath}
        className="text-[10px] uppercase tracking-widest text-zinc-500 hover:text-zinc-900 transition-colors"
      >
        ← Back to Booking
      </Link>

      <div className="mt-4 mb-8">
        <h1 className="font-serif text-2xl md:text-3xl tracking-wide mb-1 text-zinc-900">Leave a Review</h1>
        <p className="text-zinc-500 text-sm">Tell us about your experience — it helps other clients find great artists.</p>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
        <ReviewForm bookingId={params.bookingId} redirectTo={bookingPath} />
      </div>
    </div>
  );
}
