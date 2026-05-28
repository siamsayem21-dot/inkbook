import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import ConsentForm from "@/components/booking/ConsentForm";

interface Props {
  params: { studio: string; artistId: string };
  searchParams: { booking_id?: string };
}

export default async function ConsentPage({ params, searchParams }: Props) {
  const bookingId = searchParams.booking_id;

  if (!bookingId) {
    redirect(`/book/${params.studio}/${params.artistId}/book`);
  }

  const supabase = createAdminClient();

  const { data: bookingData } = await supabase
    .from("bookings")
    .select("id, status, date, time, deposit_amount_cents, artist_id")
    .eq("id", bookingId)
    .single();

  const booking = bookingData as {
    id: string;
    status: string;
    date: string;
    time: string;
    deposit_amount_cents: number;
    artist_id: string;
  } | null;

  if (!booking) {
    redirect(`/book/${params.studio}/${params.artistId}/book`);
  }

  // Already confirmed with consent → skip to confirmation
  if (booking.status === "confirmed") {
    const { data: existingConsent } = await supabase
      .from("consent_forms")
      .select("id")
      .eq("booking_id" as never, bookingId)
      .maybeSingle();

    if (existingConsent) {
      redirect(
        `/book/${params.studio}/${params.artistId}/book/confirmation?booking_id=${bookingId}`
      );
    }
  }

  const { data: artistData } = await supabase
    .from("artists")
    .select("name")
    .eq("id", booking.artist_id)
    .single();
  const artistName = (artistData as { name: string } | null)?.name ?? "Your artist";

  const appointmentDate = new Date(booking.date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const appointmentTime = booking.time.slice(0, 5).replace(":", ":");

  return (
    <main className="max-w-xl mx-auto px-6 py-10">
      <div className="mb-8">
        <p className="text-sm text-zinc-500 mb-1">Step 3 of 3</p>
        <h1 className="text-2xl font-bold">Sign consent form</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Required before your appointment is confirmed.
        </p>
      </div>

      <div className="bg-zinc-50 border border-zinc-200 rounded-xl px-5 py-4 mb-7 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-zinc-500">Artist</span>
          <span className="font-medium">{artistName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Date</span>
          <span className="font-medium">{appointmentDate}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Time</span>
          <span className="font-medium">{appointmentTime}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Deposit paid</span>
          <span className="font-medium text-green-600">
            ${(booking.deposit_amount_cents / 100).toFixed(2)}
          </span>
        </div>
      </div>

      <ConsentForm
        bookingId={booking.id}
        studioSlug={params.studio}
        artistId={params.artistId}
      />
    </main>
  );
}
