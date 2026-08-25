export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureClientAccount } from "@/lib/auth/config";
import { getBrand } from "@/lib/brand";
import { getClientBookings, type ClientBooking } from "@/lib/client-portal/bookings";
import { getBookingStatusMeta } from "@/lib/client-portal/booking-status";

interface Props {
  params: { studio: string };
}

function fmtDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmt12h(time: string) {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

const TERMINAL = new Set(["cancelled", "no_show", "completed"]);

function isUpcoming(b: ClientBooking, todayStr: string): boolean {
  if (b.status === "pending_deposit" || b.status === "awaiting_schedule") return true;
  if (TERMINAL.has(b.status)) return false;
  return Boolean(b.date && b.date >= todayStr);
}

function BookingRow({ studioSlug, booking, brandColor, textOnBrand }: { studioSlug: string; booking: ClientBooking; brandColor: string; textOnBrand: string }) {
  const meta = getBookingStatusMeta(booking.status);
  return (
    <Link
      href={`/portal/${studioSlug}/bookings/${booking.id}`}
      className="bg-white rounded-2xl border border-zinc-200 shadow-sm hover:border-zinc-300 hover:shadow-elevation-2 transition-all p-5 flex items-start justify-between gap-4 flex-wrap"
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-zinc-900 truncate">{booking.title}</p>
        <div className="flex items-center gap-2 flex-wrap mt-2.5">
          <span className={`text-[10px] px-2 py-0.5 border rounded-full ${meta.badge}`}>{meta.label}</span>
          {booking.artistName && (
            <span className="text-[10px] text-zinc-400">
              Artist: <span className="text-zinc-600">{booking.artistName}</span>
            </span>
          )}
        </div>
        <p className="text-[10px] text-zinc-400 mt-2.5">
          {booking.date ? `${fmtDate(booking.date)}${booking.time ? ` at ${fmt12h(booking.time)}` : ""}` : "Date to be confirmed"}
        </p>
      </div>
      <span
        className="shrink-0 text-[10px] uppercase tracking-widest font-semibold px-4 py-2 rounded-lg"
        style={{ backgroundColor: brandColor, color: textOnBrand }}
      >
        View →
      </span>
    </Link>
  );
}

export default async function ClientBookingsPage({ params }: Props) {
  const supabase = createAdminClient();
  const { data: studioData } = await supabase
    .from("studios")
    .select("id, name, primary_color")
    .eq("subdomain", params.studio)
    .single();

  const studio = studioData as { id: string; name: string; primary_color: string | null } | null;
  if (!studio) notFound();

  const account = await ensureClientAccount();
  const brand = getBrand(studio.primary_color ?? "#D4AF37");
  const bookings = account ? await getClientBookings(studio.id, account.id) : [];

  const todayStr = new Date().toISOString().split("T")[0];
  const upcoming = bookings.filter((b) => isUpcoming(b, todayStr));
  const past = bookings.filter((b) => !isUpcoming(b, todayStr));

  // No-date bookings need action soonest — surface first. Dated bookings sort
  // soonest-first within Upcoming, most-recent-first within Past.
  upcoming.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  past.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  return (
    <div className="max-w-3xl">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Client Portal</p>
      <h1 className="font-serif text-2xl md:text-3xl tracking-wide mb-3 text-zinc-900">My Bookings</h1>
      <p className="text-zinc-500 text-sm leading-relaxed mb-8">
        Track your upcoming appointments, deposits, and session details with {studio.name}.
      </p>

      {bookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm px-6 py-16 text-center max-w-lg">
          <h2 className="font-serif text-xl md:text-2xl tracking-wide mb-3 text-zinc-900">No bookings yet</h2>
          <p className="text-zinc-500 text-sm leading-relaxed mb-8 max-w-sm mx-auto">
            Once you accept a quote and pay your deposit, your booking will show up here.
          </p>
          <Link
            href={`/portal/${params.studio}/projects`}
            className="inline-block text-[10px] uppercase tracking-widest font-semibold px-6 py-3 rounded-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: brand.full, color: brand.textOnBrand }}
          >
            View Projects
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-3">Upcoming</p>
              <div className="space-y-3">
                {upcoming.map((b) => (
                  <BookingRow key={b.id} studioSlug={params.studio} booking={b} brandColor={brand.full} textOnBrand={brand.textOnBrand} />
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-3">Past</p>
              <div className="space-y-3">
                {past.map((b) => (
                  <BookingRow key={b.id} studioSlug={params.studio} booking={b} brandColor={brand.full} textOnBrand={brand.textOnBrand} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
