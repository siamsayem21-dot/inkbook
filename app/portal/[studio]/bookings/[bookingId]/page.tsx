export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureClientAccount } from "@/lib/auth/config";
import { getBrand } from "@/lib/brand";
import { getClientBookingDetail } from "@/lib/client-portal/bookings";
import { getBookingStatusMeta } from "@/lib/client-portal/booking-status";
import BookingDetailActions from "./BookingDetailActions";
import FeedbackRating from "./FeedbackRating";

interface Props {
  params: { studio: string; bookingId: string };
}

function fmtDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

function fmt12h(time: string) {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function fmtDollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

// Static (not live-ticking) time-remaining string — computed once at render,
// matching this feature's "no realtime" scope (see the plan's §7/Messaging
// precedent). Good enough to warn a client the 24hr auto-cancel window is
// closing without building a client-side clock.
function depositCountdown(expiresAt: string): string {
  const msRemaining = new Date(expiresAt).getTime() - Date.now();
  if (msRemaining <= 0) return "Expired — please contact the studio to rebook.";
  const hours = Math.floor(msRemaining / (60 * 60 * 1000));
  const minutes = Math.floor((msRemaining % (60 * 60 * 1000)) / (60 * 1000));
  if (hours >= 1) return `Pay within ${hours}h ${minutes}m or this booking will be released.`;
  return `Pay within ${minutes}m or this booking will be released.`;
}

export default async function ClientBookingDetailPage({ params }: Props) {
  const supabase = createAdminClient();
  const { data: studioData } = await supabase
    .from("studios")
    .select("id, name, primary_color")
    .eq("subdomain", params.studio)
    .single();

  const studio = studioData as { id: string; name: string; primary_color: string | null } | null;
  if (!studio) notFound();

  const account = await ensureClientAccount();
  if (!account) notFound();

  const booking = await getClientBookingDetail(studio.id, account.id, params.bookingId);
  if (!booking) notFound();

  const brand = getBrand(studio.primary_color ?? "#D4AF37");
  const meta = getBookingStatusMeta(booking.status);
  const balanceDueCents = booking.balanceDueCents;

  return (
    <div className="max-w-2xl">
      <Link
        href={`/portal/${params.studio}/bookings`}
        className="text-[10px] uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        ← All Bookings
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap mt-4 mb-2">
        <h1 className="font-serif text-2xl md:text-3xl tracking-wide">{booking.title}</h1>
        <span className={`text-[10px] px-2 py-0.5 border rounded-full shrink-0 mt-1.5 ${meta.badge}`}>{meta.label}</span>
      </div>
      <p className="text-zinc-500 text-xs mb-8">
        <Link href={`/portal/${params.studio}/projects/${booking.consultationId}`} className="hover:text-zinc-300 transition-colors">
          View Project →
        </Link>
      </p>

      {booking.status === "pending_deposit" && booking.depositExpiresAt && (
        <div className="border border-amber-500/20 bg-amber-500/[0.06] px-5 py-4 mb-6">
          <p className="text-amber-400 text-sm">{depositCountdown(booking.depositExpiresAt)}</p>
        </div>
      )}

      {booking.status === "awaiting_schedule" && (
        <div className="border border-violet-500/20 bg-violet-500/[0.06] px-5 py-4 mb-6">
          <p className="text-violet-300 text-sm">Your deposit is paid — the studio will confirm your date and time shortly.</p>
        </div>
      )}

      {booking.depositKept && (
        <div className="border border-red-500/20 bg-red-500/[0.06] px-5 py-4 mb-6">
          <p className="text-red-400 text-sm">Deposit was not refunded — no-show.</p>
        </div>
      )}

      <div className="border border-white/[0.08] bg-zinc-900/40 divide-y divide-white/[0.06] mb-6">
        <div className="px-6 py-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Date</p>
            <p className="text-sm text-zinc-200">{booking.date ? fmtDate(booking.date) : "To be confirmed"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Time</p>
            <p className="text-sm text-zinc-200">{booking.time ? fmt12h(booking.time) : "—"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Artist</p>
            <p className="text-sm text-zinc-200">{booking.artistName ?? "—"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Style</p>
            <p className="text-sm text-zinc-200">{booking.style}</p>
          </div>
        </div>
        {booking.description && (
          <div className="px-6 py-4">
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1.5">Description</p>
            <p className="text-sm text-zinc-200 leading-relaxed">{booking.description}</p>
          </div>
        )}
      </div>

      <div className="border border-white/[0.08] bg-zinc-900/40 p-5 mb-6">
        <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-4">Payment</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Deposit</p>
            <p className="text-sm text-zinc-200">
              {fmtDollars(booking.depositAmountCents)}{" "}
              {booking.depositPaid ? (
                <span className="text-emerald-400">— Paid</span>
              ) : (
                <span className="text-zinc-500">— Not yet paid</span>
              )}
            </p>
          </div>
          {balanceDueCents !== null && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Remaining Balance</p>
              <p className="text-sm text-zinc-200">
                {fmtDollars(balanceDueCents)}{" "}
                {booking.remainderCollected ? (
                  <span className="text-emerald-400">— Paid</span>
                ) : (
                  <span className="text-zinc-500">— due at your session</span>
                )}
              </p>
            </div>
          )}
          <div className="col-span-2">
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Consent Form</p>
            <p className="text-sm text-zinc-200">
              {booking.hasConsentForm ? "✓ Signed" : booking.depositPaid ? "Required — not yet signed" : "Sign after your deposit is paid"}
            </p>
          </div>
          {booking.status === "completed" && (
            <div className="col-span-2">
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Aftercare Instructions</p>
              <p className="text-sm text-zinc-200">
                {booking.completedAt
                  ? `✓ Sent to your email (${new Date(booking.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})`
                  : "✓ Sent to your email"}
              </p>
            </div>
          )}
          {booking.status === "completed" && (
            <div className="col-span-2">
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Review</p>
              <p className="text-sm text-zinc-200">
                {booking.hasReview ? "✓ Submitted — thank you!" : "Not yet submitted"}
              </p>
            </div>
          )}
          {booking.status === "completed" && (
            <div className="col-span-2">
              <FeedbackRating bookingId={booking.id} initialRating={booking.feedbackRating} />
            </div>
          )}
        </div>

        <BookingDetailActions
          bookingId={booking.id}
          consultationId={booking.consultationId}
          studioSlug={params.studio}
          status={booking.status}
          depositPaid={booking.depositPaid}
          hasConsentForm={booking.hasConsentForm}
          balanceDueCents={balanceDueCents}
          remainderCollected={booking.remainderCollected}
          hasReview={booking.hasReview}
          brandColor={brand.full}
          textOnBrand={brand.textOnBrand}
        />
      </div>

      <p className="text-zinc-600 text-xs leading-relaxed">
        Please arrive on time. Late arrivals may result in a shortened session. Your deposit is non-refundable for
        no-shows or cancellations within 48 hours.
      </p>
    </div>
  );
}
