import { createAdminClient } from "@/lib/supabase/admin";
import BookingConfirmation from "@/components/booking/BookingConfirmation";

interface Props {
  params: { studio: string; artistId: string };
  searchParams: { booking_id?: string };
}

export default async function ConfirmationPage({ params, searchParams }: Props) {
  const bookingId = searchParams.booking_id;

  let bookingDetails = null;

  if (bookingId) {
    const supabase = createAdminClient();
    const { data: bookingData } = await supabase
      .from("bookings")
      .select("date, time, deposit_amount_cents, artist_id")
      .eq("id", bookingId)
      .single();

    if (bookingData) {
      const bk = bookingData as {
        date: string;
        time: string;
        deposit_amount_cents: number;
        artist_id: string;
      };

      const { data: artistData } = await supabase
        .from("artists")
        .select("name")
        .eq("id", bk.artist_id)
        .single();

      bookingDetails = {
        artistName: (artistData as { name: string } | null)?.name ?? "—",
        date: new Date(bk.date).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
          timeZone: "UTC",
        }),
        time: bk.time.slice(0, 5),
        depositAmountCents: bk.deposit_amount_cents,
      };
    }
  }

  return (
    <main className="max-w-xl mx-auto px-6 py-10">
      <BookingConfirmation booking={bookingDetails} studioSlug={params.studio} />
    </main>
  );
}
