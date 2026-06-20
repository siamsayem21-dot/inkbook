import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/config";
import CopyLinkButton from "@/components/artist/CopyLinkButton";

function NoArtistProfile() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-cinzel text-2xl font-bold tracking-wide">Your Dashboard</h1>
      </div>
      <div className="bg-[#111] border border-[#1E1E1E] rounded-xl p-8 text-center">
        <p className="text-sm text-zinc-400 mb-2">Artist profile not set up yet.</p>
        <p className="text-xs text-zinc-600">
          Ask your studio owner to add you as an artist in the owner dashboard.
        </p>
      </div>
    </div>
  );
}

// Bookings come back as objects because client_id is a singular FK
type BookingWithClient = {
  id: string;
  time: string;
  deposit_amount_cents: number;
  clients: { full_name: string } | null;
};

type UpcomingBookingWithClient = {
  id: string;
  date: string;
  time: string;
  clients: { full_name: string } | null;
};

function fmt12h(time: string) {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function fmtMoney(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function fmtDayLabel(dateStr: string) {
  // dateStr is YYYY-MM-DD — force local midnight to avoid UTC-offset shift
  const [y, mo, d] = dateStr.split("-").map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default async function ArtistDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Admin client bypasses RLS — auth already verified above via getCurrentUser()
  const supabase = createAdminClient();

  type ArtistRow = { id: string; name: string; studio_id: string };
  type StudioRow = { subdomain: string };

  // Query: SELECT id, name, studio_id FROM artists WHERE user_id = '<auth_uid>' LIMIT 1
  const { data: artistData, error: artistError } = await supabase
    .from("artists")
    .select("id, name, studio_id")
    .eq("user_id", user.id)
    .single();

  if (artistError) {
    console.error("[artist/dashboard] artist lookup failed:", artistError.message, "| user_id:", user.id);
  }

  const artist = artistData as ArtistRow | null;

  // Artist profile not linked yet — show empty dashboard, do not redirect to login
  // (redirecting causes an infinite loop: login redirects back here after auth)
  if (!artist) {
    return <NoArtistProfile />;
  }

  const { data: studioData } = await supabase
    .from("studios")
    .select("subdomain")
    .eq("id", artist.studio_id)
    .single();

  const studio = studioData as StudioRow | null;

  const studioSlug = studio?.subdomain ?? "my-studio";
  const bookingLink = `inkbook.tech/book/${studioSlug}/${artist.id}`;

  // Date helpers
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  const future = new Date(now);
  future.setDate(future.getDate() + 7);
  const in7Str = `${future.getFullYear()}-${pad(future.getMonth() + 1)}-${pad(future.getDate())}`;

  const firstOfMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const lastOfMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(lastDay)}`;

  // Query: SELECT id, time, deposit_amount, clients(full_name)
  //        FROM bookings WHERE artist_id = $1 AND date = $2 ORDER BY time ASC
  const { data: todayRaw } = await supabase
    .from("bookings")
    .select("id, time, deposit_amount_cents, clients(full_name)")
    .eq("artist_id", artist.id)
    .eq("date", todayStr)
    .order("time", { ascending: true });

  const todayBookings = (todayRaw ?? []) as unknown as BookingWithClient[];

  // Query: SELECT id, date, time, clients(full_name)
  //        FROM bookings WHERE artist_id = $1 AND date > $2 AND date <= $3
  //        ORDER BY date ASC, time ASC
  const { data: upcomingRaw } = await supabase
    .from("bookings")
    .select("id, date, time, clients(full_name)")
    .eq("artist_id", artist.id)
    .gt("date", todayStr)
    .lte("date", in7Str)
    .order("date", { ascending: true })
    .order("time", { ascending: true });

  const upcomingBookings = (upcomingRaw ?? []) as unknown as UpcomingBookingWithClient[];

  // Group upcoming by date
  const byDay: Record<string, UpcomingBookingWithClient[]> = {};
  for (const b of upcomingBookings) {
    (byDay[b.date] ??= []).push(b);
  }

  // Query: SELECT deposit_amount FROM bookings
  //        WHERE artist_id = $1 AND status = 'confirmed'
  //        AND date >= $2 AND date <= $3
  const { data: monthRaw } = await supabase
    .from("bookings")
    .select("deposit_amount_cents")
    .eq("artist_id", artist.id)
    .eq("status", "confirmed")
    .gte("date", firstOfMonth)
    .lte("date", lastOfMonth);

  const monthEarnings = ((monthRaw ?? []) as { deposit_amount_cents: number }[]).reduce(
    (sum, b) => sum + (b.deposit_amount_cents ?? 0),
    0
  ) / 100;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-cinzel text-2xl font-bold tracking-wide">Your Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {now.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#111] border border-[#1E1E1E] rounded-xl p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">
            This Month&apos;s Earnings
          </p>
          <p className="text-3xl font-semibold text-[#c9a84c]">
            {fmtMoney(monthEarnings)}
          </p>
          <p className="text-xs text-zinc-600 mt-2">confirmed deposits only</p>
        </div>

        <div className="bg-[#111] border border-[#1E1E1E] rounded-xl p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">
            Today&apos;s Bookings
          </p>
          <p className="text-3xl font-semibold text-[#c9a84c]">
            {todayBookings.length}
          </p>
          <p className="text-xs text-zinc-600 mt-2">appointments today</p>
        </div>

        <div className="bg-[#111] border border-[#1E1E1E] rounded-xl p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">
            Next 7 Days
          </p>
          <p className="text-3xl font-semibold text-[#c9a84c]">
            {upcomingBookings.length}
          </p>
          <p className="text-xs text-zinc-600 mt-2">upcoming appointments</p>
        </div>
      </div>

      {/* Booking link */}
      <div className="bg-[#111] border border-[#1E1E1E] rounded-xl p-5 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">
            Your Booking Link
          </p>
          <p className="font-mono text-sm text-[#c9a84c] break-all">{bookingLink}</p>
        </div>
        <CopyLinkButton link={bookingLink} />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Today's bookings */}
        <div className="bg-[#111] border border-[#1E1E1E] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1A1A1A]">
            <h2 className="text-sm font-medium text-[#BBB]">Today&apos;s Bookings</h2>
            <span className="text-xs bg-[#c9a84c]/10 text-[#c9a84c] rounded-full px-3 py-1">
              {todayBookings.length} total
            </span>
          </div>

          {todayBookings.length === 0 ? (
            <p className="px-5 py-10 text-sm text-zinc-600 text-center">
              No bookings today
            </p>
          ) : (
            todayBookings.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-4 px-5 py-3.5 border-b border-[#161616] last:border-0"
              >
                <span className="text-xs text-[#c9a84c] font-medium w-16 shrink-0">
                  {fmt12h(b.time)}
                </span>
                <span className="flex-1 text-sm text-[#CCC]">
                  {b.clients?.full_name ?? "—"}
                </span>
                <span className="text-sm text-zinc-400">
                  ${(b.deposit_amount_cents / 100).toFixed(2)}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Next 7 days */}
        <div className="bg-[#111] border border-[#1E1E1E] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1A1A1A]">
            <h2 className="text-sm font-medium text-[#BBB]">Next 7 Days</h2>
            <span className="text-xs bg-[#c9a84c]/10 text-[#c9a84c] rounded-full px-3 py-1">
              {upcomingBookings.length} upcoming
            </span>
          </div>

          {Object.keys(byDay).length === 0 ? (
            <p className="px-5 py-10 text-sm text-zinc-600 text-center">
              No upcoming bookings
            </p>
          ) : (
            Object.entries(byDay).map(([date, bookings]) => (
              <div key={date}>
                <div className="px-5 py-2 bg-[#0D0D0D] border-b border-[#161616]">
                  <span className="text-xs text-zinc-500 uppercase tracking-wider">
                    {fmtDayLabel(date)}
                  </span>
                </div>
                {bookings.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-4 px-5 py-3 border-b border-[#161616] last:border-0"
                  >
                    <span className="text-xs text-[#c9a84c] w-16 shrink-0">
                      {fmt12h(b.time)}
                    </span>
                    <span className="text-sm text-[#CCC]">
                      {b.clients?.full_name ?? "—"}
                    </span>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
