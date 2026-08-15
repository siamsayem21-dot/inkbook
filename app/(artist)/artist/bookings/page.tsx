import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";
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

function fmtDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function fmt12h(time: string) {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export default async function ArtistBookingsPage() {
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

  const today = new Date().toISOString().split("T")[0];

  const { data: bookingsRaw } = await supabase
    .from("bookings")
    .select("id, date, time, style, status, deposit_paid, clients(full_name)")
    .eq("artist_id", artist.id)
    .order("date", { ascending: false })
    .order("time", { ascending: false });

  const bookings = (bookingsRaw ?? []) as unknown as BookingRow[];

  // Consent state per booking — same existence-only check the detail page uses.
  const bookingIds = bookings.map((b) => b.id);
  const { data: consentRows } = bookingIds.length
    ? await supabase.from("consent_forms").select("booking_id").in("booking_id", bookingIds)
    : { data: [] as { booking_id: string }[] };
  const consentedIds = new Set(((consentRows ?? []) as { booking_id: string }[]).map((c) => c.booking_id));

  const upcoming  = bookings.filter((b) => b.date >= today && b.status !== "cancelled" && b.status !== "completed" && b.status !== "no_show");
  const completed = bookings.filter((b) => b.status === "completed");
  const cancelled = bookings.filter((b) => b.status === "cancelled" || b.status === "no_show");

  const groups = [
    { label: "Upcoming",  rows: upcoming },
    { label: "Completed", rows: completed },
    { label: "Cancelled", rows: cancelled },
  ];

  return (
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">My Bookings</h1>

        {bookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm px-6 py-16 text-center">
            <p className="text-base font-semibold text-zinc-900 mb-2">No Bookings Yet</p>
            <p className="text-zinc-500 text-sm">Appointments assigned to you will show up here.</p>
          </div>
        ) : (
          groups.map(({ label, rows }) =>
            rows.length === 0 ? null : (
              <div key={label}>
                <h2 className="text-sm font-semibold text-zinc-500 mb-3">{label}</h2>
                <div className="space-y-2">
                  {rows.map((b) => (
                    <BookingCard
                      key={b.id}
                      bookingId={b.id}
                      clientName={b.clients?.full_name ?? "Unknown client"}
                      date={fmtDate(b.date)}
                      time={fmt12h(b.time)}
                      style={b.style}
                      status={b.status}
                      depositPaid={b.deposit_paid}
                      consentSigned={consentedIds.has(b.id)}
                    />
                  ))}
                </div>
              </div>
            )
          )
        )}
      </div>
    </div>
  );
}
