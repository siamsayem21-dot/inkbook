import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import DepositCheckout from "@/components/booking/DepositCheckout";

interface Props {
  params: { studio: string; artistId: string };
  searchParams: { booking_id?: string; cancelled?: string };
}

const STEPS = ["Your details", "Pay deposit", "Sign consent"];

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

  if (booking.status === "confirmed") {
    redirect(`/book/${params.studio}/${params.artistId}/book/consent?booking_id=${bookingId}`);
  }

  return (
    <main className="max-w-xl mx-auto px-6 py-10">

      {/* Back */}
      <Link
        href={`/book/${params.studio}/${params.artistId}/book`}
        className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-8"
      >
        ← Edit details
      </Link>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-10">
        {STEPS.map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 ${i === 1 ? "" : "opacity-40"}`}>
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  i < 1
                    ? "bg-gold/30 text-gold"
                    : i === 1
                    ? "bg-gold text-black"
                    : "bg-zinc-800 text-white/50"
                }`}
              >
                {i < 1 ? "✓" : i + 1}
              </div>
              <span className={`text-xs ${i === 1 ? "text-white font-medium" : "text-white/40"} hidden sm:block`}>
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
        <h1 className="text-2xl font-bold mb-1">Pay your deposit</h1>
        <p className="text-white/40 text-sm">
          Your slot is held for 24 hours. Booking is auto-cancelled if payment is not received.
        </p>
      </div>

      {searchParams.cancelled && (
        <div className="mb-6 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm rounded-xl px-4 py-3">
          Payment was cancelled. Your booking slot is still held — you can try again below.
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
