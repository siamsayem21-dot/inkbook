interface Props {
  params: { bookingId: string };
}

export default function ArtistBookingDetailPage({ params }: Props) {
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Booking #{params.bookingId}</h1>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Client name", value: "—" },
            { label: "Date & time", value: "—" },
            { label: "Style", value: "—" },
            { label: "Deposit paid", value: "—" },
            { label: "Consent form", value: "—" },
            { label: "Notes", value: "—" },
          ].map((r) => (
            <div key={r.label}>
              <p className="text-zinc-400 text-xs mb-0.5">{r.label}</p>
              <p className="text-sm font-medium">{r.value}</p>
            </div>
          ))}
        </div>
        <hr className="border-zinc-800" />
        <div className="flex gap-3">
          <button className="text-sm bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-full">View consent form</button>
          <button className="text-sm bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-full">Start session agreement</button>
          <button className="text-sm text-red-400 hover:text-red-300 ml-auto">Mark no-show</button>
        </div>
      </div>
    </div>
  );
}
