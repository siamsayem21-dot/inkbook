interface BookingDetails {
  artistName: string;
  date: string;
  time: string;
  depositAmountCents: number;
}

interface Props {
  booking: BookingDetails | null;
  studioSlug: string;
}

export default function BookingConfirmation({ booking, studioSlug }: Props) {
  return (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div>
        <h1 className="text-2xl font-bold">You&apos;re booked!</h1>
        <p className="text-zinc-500 mt-2 text-sm">
          Your appointment is confirmed. You&apos;ll receive SMS reminders 48 hours before and
          on the day of your appointment.
        </p>
      </div>

      <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 text-left space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Artist</span>
          <span className="font-medium text-gray-900">{booking?.artistName ?? "—"}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Date</span>
          <span className="font-medium text-gray-900">{booking?.date ?? "—"}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Time</span>
          <span className="font-medium text-gray-900">{booking?.time ?? "—"}</span>
        </div>
        <hr className="border-zinc-200" />
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Deposit paid</span>
          <span className="font-medium text-green-600">
            {booking ? `$${(booking.depositAmountCents / 100).toFixed(2)}` : "—"}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Consent form</span>
          <span className="font-medium text-green-600">Signed ✓</span>
        </div>
      </div>

      <p className="text-xs text-zinc-400">
        A confirmation has been sent to your email and phone. Please arrive on time —
        late arrivals may result in a shortened session.
      </p>

      <a
        href={`/book/${studioSlug}`}
        className="inline-block text-sm text-zinc-500 hover:text-zinc-700 underline underline-offset-2"
      >
        Back to studio
      </a>
    </div>
  );
}
