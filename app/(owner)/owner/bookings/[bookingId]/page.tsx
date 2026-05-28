interface Props {
  params: { bookingId: string };
}

export default function BookingDetailPage({ params }: Props) {
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Booking #{params.bookingId}</h1>
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Client", value: "—" },
          { label: "Artist", value: "—" },
          { label: "Date & Time", value: "—" },
          { label: "Deposit paid", value: "—" },
          { label: "Status", value: "—" },
          { label: "Consent form", value: "—" },
        ].map((r) => (
          <div key={r.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-400 text-xs mb-1">{r.label}</p>
            <p className="font-medium">{r.value}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <button className="text-sm bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-full">View consent form</button>
        <button className="text-sm text-red-400 hover:text-red-300">Cancel booking</button>
      </div>
    </div>
  );
}
