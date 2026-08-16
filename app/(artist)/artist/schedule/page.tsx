export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/config";
import ScheduleCalendar from "@/components/artist/ScheduleCalendar";
import BookingCard from "@/components/artist/BookingCard";

type BookingRow = {
  id: string;
  date: string;
  time: string;
  style: string;
  status: string;
  deposit_paid: boolean;
  clients: { full_name: string } | null;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseDateStr(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Long label for the day header, e.g. "Monday, August 17, 2026"
function fmtDayLabel(dateStr: string) {
  return parseDateStr(dateStr).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

// Short label for booking cards, matching the format used on /artist/bookings
function fmtDateShort(dateStr: string) {
  return parseDateStr(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function fmt12h(time: string) {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

interface Props {
  searchParams: { date?: string };
}

export default async function SchedulePage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();

  const { data: artistRaw } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const artist = artistRaw as { id: string } | null;
  if (!artist) redirect("/artist/dashboard");

  const todayStr = toDateStr(new Date());
  const rawDate = searchParams.date;
  const viewDate = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : todayStr;
  const isToday = viewDate === todayStr;

  const viewDateObj = parseDateStr(viewDate);
  const prevDateObj = new Date(viewDateObj);
  prevDateObj.setDate(prevDateObj.getDate() - 1);
  const nextDateObj = new Date(viewDateObj);
  nextDateObj.setDate(nextDateObj.getDate() + 1);
  const prevStr = toDateStr(prevDateObj);
  const nextStr = toDateStr(nextDateObj);

  const [{ data: bookingsRaw }, { data: availRaw }] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, date, time, style, status, deposit_paid, clients(full_name)")
      .eq("artist_id", artist.id)
      .eq("date", viewDate)
      .order("time", { ascending: true }),
    supabase
      .from("artist_availability" as never)
      .select("day_of_week, hour")
      .eq("artist_id" as never, artist.id),
  ]);

  const bookings = (bookingsRaw ?? []) as unknown as BookingRow[];

  const bookingIds = bookings.map((b) => b.id);
  const { data: consentRows } = bookingIds.length
    ? await supabase.from("consent_forms").select("booking_id").in("booking_id", bookingIds)
    : { data: [] as { booking_id: string }[] };
  const consentedIds = new Set(((consentRows ?? []) as { booking_id: string }[]).map((c) => c.booking_id));

  const initialSlots = ((availRaw ?? []) as { day_of_week: number; hour: number }[]).map(
    (r) => `${r.day_of_week}-${r.hour}`
  );

  return (
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">My Schedule</h1>

        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 md:p-5 flex items-center justify-between gap-3">
          <Link
            href={`/artist/schedule?date=${prevStr}`}
            className="text-sm text-zinc-500 hover:text-zinc-900 px-3 py-1.5 rounded-lg hover:bg-zinc-50 transition-colors shrink-0"
          >
            ← Prev
          </Link>
          <div className="text-center min-w-0">
            <p className="text-sm font-semibold text-zinc-900 truncate">{fmtDayLabel(viewDate)}</p>
            {isToday ? (
              <p className="text-[11px] text-violet-600 font-medium mt-0.5">Today</p>
            ) : (
              <Link
                href="/artist/schedule"
                className="text-[11px] text-violet-600 hover:text-violet-700 font-medium mt-0.5 inline-block"
              >
                Jump to today
              </Link>
            )}
          </div>
          <Link
            href={`/artist/schedule?date=${nextStr}`}
            className="text-sm text-zinc-500 hover:text-zinc-900 px-3 py-1.5 rounded-lg hover:bg-zinc-50 transition-colors shrink-0"
          >
            Next →
          </Link>
        </div>

        {bookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm px-6 py-12 text-center">
            <p className="text-base font-semibold text-zinc-900 mb-1">No appointments this day</p>
            <p className="text-zinc-500 text-sm">Nothing scheduled for {fmtDayLabel(viewDate)}.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {bookings.map((b) => (
              <BookingCard
                key={b.id}
                bookingId={b.id}
                clientName={b.clients?.full_name ?? "Unknown client"}
                date={fmtDateShort(viewDate)}
                time={fmt12h(b.time)}
                style={b.style}
                status={b.status}
                depositPaid={b.deposit_paid}
                consentSigned={consentedIds.has(b.id)}
              />
            ))}
          </div>
        )}

        <div>
          <h2 className="text-lg font-bold text-zinc-900 mb-3">Weekly Availability</h2>
          <ScheduleCalendar artistId={artist.id} initial={initialSlots} />
        </div>
      </div>
    </div>
  );
}
