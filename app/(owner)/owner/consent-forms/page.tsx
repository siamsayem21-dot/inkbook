export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioId } from "@/lib/auth/config";

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

export default async function OwnerConsentFormsPage() {
  const studioId = await getStudioId();
  if (!studioId) redirect("/login");

  const supabase = createAdminClient();

  const { data: bookingsRaw } = await supabase
    .from("bookings")
    .select("id, date, artists(name)")
    .eq("studio_id", studioId);

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
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Consent Forms</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {forms.length} form{forms.length !== 1 ? "s" : ""} submitted
          </p>
        </div>

        {forms.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm px-6 py-16 text-center">
            <p className="text-base font-semibold text-zinc-900 mb-2">No Consent Forms Yet</p>
            <p className="text-zinc-500 text-sm">Forms signed during client bookings will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {forms.map((f) => (
              <div key={f.id} className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <p className="font-semibold text-zinc-900">{f.clientName}</p>
                  <p className="text-[11px] text-zinc-400 shrink-0">Signed {f.signedAt}</p>
                </div>
                <p className="text-sm text-zinc-500 mt-1">
                  {f.artistName} · Appointment {f.bookingDate}
                </p>
                <div className="mt-3 pt-3 border-t border-zinc-100">
                  <a
                    href={`/owner/bookings/${f.bookingId}`}
                    className="text-xs font-medium text-violet-600 hover:text-violet-700 transition-colors"
                  >
                    View booking →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
