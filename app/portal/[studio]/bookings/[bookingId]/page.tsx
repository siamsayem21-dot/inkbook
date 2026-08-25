export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureClientAccount } from "@/lib/auth/config";
import { getBrand } from "@/lib/brand";
import { getClientBookingDetail } from "@/lib/client-portal/bookings";
import { getBookingStatusMeta } from "@/lib/client-portal/booking-status";
import BookingDetailActions from "./BookingDetailActions";

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
        className="text-[10px] uppercase tracking-widest text-zinc-500 hover:text-zinc-900 transition-colors"
      >
        ← All Bookings
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap mt-4 mb-2">
        <h1 className="font-serif text-2xl md:text-3xl tracking-wide text-zinc-900">{booking.title}</h1>
        <span className={`text-[10px] px-2 py-0.5 border rounded-full shrink-0 mt-1.5 ${meta.badge}`}>{meta.label}</span>
      </div>
      <p className="text-zinc-500 text-xs mb-8">
        <Link href={`/portal/${params.studio}/projects/${booking.consultationId}`} className="hover:text-zinc-900 transition-colors">
          View Project →
        </Link>
      </p>

      {booking.status === "pending_deposit" && booking.depositExpiresAt && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 mb-6">
          <p className="text-amber-800 text-sm">{depositCountdown(booking.depositExpiresAt)}</p>
        </div>
      )}

      {booking.status === "awaiting_schedule" && (
        <div className="rounded-2xl border border-violet-200 bg-violet-50 px-5 py-4 mb-6">
          <p className="text-violet-800 text-sm">Your deposit is paid — the studio will confirm your date and time shortly.</p>
        </div>
      )}

      {booking.depositKept && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 mb-6">
          <p className="text-red-700 text-sm">Deposit was not refunded — no-show.</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm divide-y divide-zinc-100 mb-6">
        <div className="px-6 py-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1">Date</p>
            <p className="text-sm text-zinc-900">{booking.date ? fmtDate(booking.date) : "To be confirmed"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1">Time</p>
            <p className="text-sm text-zinc-900">{booking.time ? fmt12h(booking.time) : "—"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1">Artist</p>
            <p className="text-sm text-zinc-900">{booking.artistName ?? "—"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1">Style</p>
            <p className="text-sm text-zinc-900">{booking.style}</p>
          </div>
        </div>
        {booking.description && (
          <div className="px-6 py-4">
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1.5">Description</p>
            <p className="text-sm text-zinc-900 leading-relaxed">{booking.description}</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5 mb-6">
        <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-4">Payment</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1">Deposit</p>
            <p className="text-sm text-zinc-900">
              {fmtDollars(booking.depositAmountCents)}{" "}
              {booking.depositPaid ? (
                <span className="text-emerald-600">— Paid</span>
              ) : (
                <span className="text-zinc-400">— Not yet paid</span>
              )}
            </p>
          </div>
          {balanceDueCents !== null && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1">Remaining Balance</p>
              <p className="text-sm text-zinc-900">
                {fmtDollars(balanceDueCents)}{" "}
                {booking.remainderCollected ? (
                  <span className="text-emerald-600">— Paid</span>
                ) : (
                  <span className="text-zinc-400">— due at your session</span>
                )}
              </p>
            </div>
          )}
          <div className="col-span-2">
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1">Consent Form</p>
            <p className="text-sm text-zinc-900">
              {booking.hasConsentForm ? "✓ Signed" : booking.depositPaid ? "Required — not yet signed" : "Sign after your deposit is paid"}
            </p>
          </div>
          {booking.status === "completed" && (
            <div className="col-span-2">
              <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1">Aftercare Instructions</p>
              <p className="text-sm text-zinc-900">
                {booking.completedAt
                  ? `✓ Sent to your email (${new Date(booking.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})`
                  : "✓ Sent to your email"}
              </p>
            </div>
          )}
          {booking.status === "completed" && (
            <div className="col-span-2">
              <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1">Review</p>
              <p className="text-sm text-zinc-900">
                {booking.hasReview ? "✓ Submitted — thank you!" : "Not yet submitted"}
              </p>
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

      <p className="text-zinc-400 text-xs leading-relaxed">
        Please arrive on time. Late arrivals may result in a shortened session. Your deposit is non-refundable for
        no-shows or cancellations within 48 hours.
      </p>
    </div>
  );
}
