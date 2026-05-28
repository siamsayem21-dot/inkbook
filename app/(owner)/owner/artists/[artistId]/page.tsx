interface Props {
  params: { artistId: string };
}

export default function ArtistDetailPage({ params }: Props) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Artist #{params.artistId}</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Bookings this month", value: "14" },
          { label: "Revenue generated", value: "$3,200" },
          { label: "No-show rate", value: "2%" },
        ].map((s) => (
          <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <p className="text-zinc-400 text-sm mb-1">{s.label}</p>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="font-semibold mb-4">Settings</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-zinc-400 block mb-1">Minimum rate ($/hr)</label>
            <input type="number" defaultValue={150} className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-zinc-500" />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button className="bg-white text-black text-sm px-4 py-2 rounded-full font-semibold hover:bg-zinc-200">Save</button>
            <button className="text-red-400 text-sm hover:text-red-300">Remove artist</button>
          </div>
        </div>
      </section>
    </div>
  );
}
