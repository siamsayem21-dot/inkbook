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

  const upcoming  = bookings.filter((b) => b.date >= today && b.status !== "cancelled" && b.status !== "completed");
  const completed = bookings.filter((b) => b.status === "completed");
  const cancelled = bookings.filter((b) => b.status === "cancelled");

  const groups = [
    { label: "Upcoming",  rows: upcoming },
    { label: "Completed", rows: completed },
    { label: "Cancelled", rows: cancelled },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Bookings</h1>

      {bookings.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-6 py-16 text-center">
          <p className="text-zinc-500 text-sm">No bookings yet.</p>
        </div>
      ) : (
        groups.map(({ label, rows }) =>
          rows.length === 0 ? null : (
            <div key={label}>
              <h2 className="text-sm font-medium text-zinc-400 mb-3">{label}</h2>
              <div className="space-y-3">
                {rows.map((b) => (
                  <BookingCard
                    key={b.id}
                    bookingId={b.id}
                    clientName={b.clients?.full_name ?? "Unknown client"}
                    date={fmtDate(b.date)}
                    time={fmt12h(b.time)}
                    style={b.style}
                    depositPaid={b.deposit_paid}
                  />
                ))}
              </div>
            </div>
          )
        )
      )}
    </div>
  );
}
