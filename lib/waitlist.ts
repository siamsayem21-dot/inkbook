import { createAdminClient } from "@/lib/supabase/admin";

// Counts an artist's confirmed+completed bookings, plus not-yet-expired
// pending_deposit bookings, within the calendar month of `dateStr`
// (YYYY-MM-DD) — the month a booking is being requested FOR, not
// necessarily the current month. This is intentionally a new, separate
// helper rather than a reuse of the existing artist_bookings_this_month()
// RPC (supabase/migrations/20260527000000_initial_schema.sql): that RPC
// hardcodes `date_trunc('month', NOW())`, so it can only ever answer "how
// many bookings this artist has THIS month" — it would silently give the
// wrong answer for a booking requested for a future month. Left untouched
// per explicit instruction (no RPC changes, no migration for this feature).
//
// pending_deposit bookings already occupy a real date/time slot (the
// classic flow in app/api/bookings/route.ts inserts one upfront, before
// the deposit is paid) and only stop being real once cancel_expired_bookings()
// reaps them past deposit_expires_at (app/api/cron/cancel-expired/route.ts).
// Excluding them let an artist's cap be exceeded by ordinary sequential
// use — several bookings each pass the check while the others are still
// pending, then all later confirm via the Stripe webhook with no
// re-check. Counting live pending_deposit rows here closes that gap.
export async function getArtistBookingCountForMonth(
  supabase: ReturnType<typeof createAdminClient>,
  artistId: string,
  dateStr: string
): Promise<number> {
  const [year, month] = dateStr.split("-").map(Number);
  const firstOfMonth = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const lastOfMonth = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const nowIso = new Date().toISOString();

  const { data } = await supabase
    .from("bookings")
    .select("id")
    .eq("artist_id", artistId)
    .gte("date", firstOfMonth)
    .lte("date", lastOfMonth)
    .or(`status.in.(confirmed,completed),and(status.eq.pending_deposit,deposit_expires_at.gt.${nowIso})`);

  return (data ?? []).length;
}

// A cap is a hard ceiling: at or above it means no more bookings for that
// month (matches the schema comment on monthly_booking_cap — "max bookings
// per month before waitlist").
export async function isAtMonthlyCap(
  supabase: ReturnType<typeof createAdminClient>,
  artistId: string,
  monthlyBookingCap: number,
  dateStr: string
): Promise<boolean> {
  const count = await getArtistBookingCountForMonth(supabase, artistId, dateStr);
  return count >= monthlyBookingCap;
}
