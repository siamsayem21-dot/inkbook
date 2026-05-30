import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import ConsentForm from "@/components/booking/ConsentForm";

interface Props {
  params: { studio: string; artistId: string };
  searchParams: { booking_id?: string };
}

const STEPS = ["Your details", "Pay deposit", "Sign consent"];

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

  if (booking.status === "confirmed") {
    const { data: existingConsent } = await supabase
      .from("consent_forms")
      .select("id")
      .eq("booking_id" as never, bookingId)
      .maybeSingle();

    if (existingConsent) {
      redirect(`/book/${params.studio}/${params.artistId}/book/confirmation?booking_id=${bookingId}`);
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
  const appointmentTime = booking.time.slice(0, 5);

  return (
    <main className="max-w-xl mx-auto px-6 py-10">

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-10">
        {STEPS.map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  i < 2
                    ? "bg-gold/30 text-gold"
                    : "bg-gold text-black"
                }`}
              >
                {i < 2 ? "✓" : i + 1}
              </div>
              <span className={`text-xs ${i === 2 ? "text-white font-medium" : "text-white/40"} hidden sm:block`}>
                {step}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="w-8 h-px bg-white/10 mx-1" />
            )}
          </div>
        ))}
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Sign consent form</h1>
        <p className="text-gray-400 text-sm">Required before your appointment is confirmed.</p>
      </div>

      {/* Booking summary */}
      <div className="bg-zinc-900 border border-white/10 rounded-2xl px-5 py-4 mb-7 space-y-2.5 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Artist</span>
          <span className="font-medium text-gray-200">{artistName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Date</span>
          <span className="font-medium text-gray-200">{appointmentDate}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Time</span>
          <span className="font-medium text-gray-200">{appointmentTime}</span>
        </div>
        <div className="flex justify-between border-t border-white/10 pt-2.5">
          <span className="text-gray-400">Deposit paid</span>
          <span className="font-medium text-gold">
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
