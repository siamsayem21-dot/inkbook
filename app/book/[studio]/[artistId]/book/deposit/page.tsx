import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import DepositCheckout from "@/components/booking/DepositCheckout";

interface Props {
  params: { studio: string; artistId: string };
  searchParams: { booking_id?: string; cancelled?: string };
}

export default async function DepositPage({ params, searchParams }: Props) {
  const bookingId = searchParams.booking_id;

  if (!bookingId) {
    redirect(`/book/${params.studio}/${params.artistId}/book`);
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("bookings")
    .select("id, deposit_amount_cents, status")
    .eq("id", bookingId)
    .single();

  const booking = data as { id: string; deposit_amount_cents: number; status: string } | null;

  if (!booking) {
    redirect(`/book/${params.studio}/${params.artistId}/book`);
  }

  // Already paid — skip to consent
  if (booking.status === "confirmed") {
    redirect(`/book/${params.studio}/${params.artistId}/book/consent?booking_id=${bookingId}`);
  }

  return (
    <main className="max-w-xl mx-auto px-6 py-10">
      <div className="mb-8">
        <p className="text-sm text-zinc-500 mb-1">Step 2 of 3</p>
        <h1 className="text-2xl font-bold">Pay your deposit</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Your slot is held for 24 hours. If payment is not received, the booking is automatically cancelled.
        </p>
      </div>

      {searchParams.cancelled && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-lg px-4 py-3">
          Payment was cancelled. You can try again below — your booking slot is still held.
        </div>
      )}

      <DepositCheckout
        bookingId={booking.id}
        depositAmountCents={booking.deposit_amount_cents}
        studioSlug={params.studio}
        artistId={params.artistId}
      />
    </main>
  );
}
