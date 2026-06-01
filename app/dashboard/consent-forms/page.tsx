export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/admin";

const STUDIO_ID = "5fe382a1-fee7-4387-b625-4bf7a52b8f45";

type ArtistRef = { name: string };
type BookingRef = { id: string; date: string; artists: ArtistRef | null };
type ClientRef = { full_name: string };
type ConsentFormRef = { id: string; booking_id: string; signed_at: string; clients: ClientRef | null };

type FormRow = {
  id: string;
  clientName: string;
  artistName: string;
  bookingDate: string;
  signedAt: string;
  bookingId: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ConsentFormsPage() {
  const supabase = createAdminClient();

  // Get all bookings for this studio with artist names
  const { data: bookingsRaw } = await supabase
    .from("bookings")
    .select("id, date, artists(name)")
    .eq("studio_id", STUDIO_ID);

  const bookings = (bookingsRaw as BookingRef[]) ?? [];
  const bookingIds = bookings.map((b) => b.id);
  const bookingMap = new Map(bookings.map((b) => [b.id, b]));

  let forms: FormRow[] = [];

  if (bookingIds.length > 0) {
    const { data: consentFormsRaw } = await supabase
      .from("consent_forms")
      .select("id, booking_id, signed_at, clients(full_name)")
      .in("booking_id", bookingIds)
      .order("signed_at", { ascending: false });

    forms = ((consentFormsRaw as ConsentFormRef[]) ?? []).map((f) => {
      const booking = bookingMap.get(f.booking_id);
      return {
        id: f.id,
        clientName: f.clients?.full_name ?? "—",
        artistName: booking?.artists?.name ?? "—",
        bookingDate: booking?.date ? formatDate(booking.date) : "—",
        signedAt: formatDate(f.signed_at),
        bookingId: f.booking_id,
      };
    });
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">Consent Forms</h1>
        <p className="text-white/40 text-sm">
          {forms.length} form{forms.length !== 1 ? "s" : ""} submitted
        </p>
      </div>

      {forms.length === 0 ? (
        <div className="bg-zinc-900 border border-white/10 rounded-2xl px-5 py-16 text-center">
          <p className="text-white/40 text-sm">No consent forms yet.</p>
          <p className="text-white/25 text-xs mt-1">
            Forms signed during client bookings will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {["Client", "Artist", "Appointment", "Signed", ""].map((h) => (
                  <th
                    key={h}
                    className="text-left text-white/30 text-xs font-medium px-5 py-3.5 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {forms.map((f, i) => (
                <tr
                  key={f.id}
                  className={i < forms.length - 1 ? "border-b border-white/5" : ""}
                >
                  <td className="px-5 py-4 font-medium">{f.clientName}</td>
                  <td className="px-5 py-4 text-white/50">{f.artistName}</td>
                  <td className="px-5 py-4 text-white/50">{f.bookingDate}</td>
                  <td className="px-5 py-4 text-white/50">{f.signedAt}</td>
                  <td className="px-5 py-4 text-right">
                    <a
                      href={`/owner/bookings/${f.bookingId}`}
                      className="text-xs text-gold hover:underline"
                    >
                      View booking
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
