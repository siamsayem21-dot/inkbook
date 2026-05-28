import BookingForm from "@/components/booking/BookingForm";

interface Props {
  params: { studio: string; artistId: string };
}

export default function BookingFormPage({ params }: Props) {
  return (
    <main className="max-w-xl mx-auto px-6 py-10">
      <div className="mb-8">
        <p className="text-sm text-zinc-500 mb-1">Step 1 of 3</p>
        <h1 className="text-2xl font-bold">Your appointment details</h1>
        <p className="text-zinc-500 text-sm mt-1">
          A deposit is required to confirm your booking. It is non-refundable for no-shows.
        </p>
      </div>
      <BookingForm studioSlug={params.studio} artistId={params.artistId} />
    </main>
  );
}
