import MotionCard from "@/components/ui/MotionCard";

interface Props {
  params: { artistId: string };
}

export default function ArtistDetailPage({ params }: Props) {
  return (
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Artist #{params.artistId}</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "Bookings this month", value: "14" },
            { label: "Revenue generated", value: "$3,200" },
            { label: "No-show rate", value: "2%" },
          ].map((s) => (
            <MotionCard key={s.label} className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5">
              <p className="text-zinc-500 text-sm mb-1">{s.label}</p>
              <p className="text-2xl font-bold text-zinc-900">{s.value}</p>
            </MotionCard>
          ))}
        </div>
        <section className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
          <h2 className="font-semibold text-zinc-900 mb-4">Settings</h2>
          <div className="space-y-3">
            <div>
              <label htmlFor="artist-detail-min-rate" className="text-sm text-zinc-400 block mb-1">Minimum rate ($/hr)</label>
              <input
                id="artist-detail-min-rate"
                type="number"
                defaultValue={150}
                className="bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2 text-sm text-zinc-800 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-colors"
              />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button className="bg-violet-600 hover:bg-violet-700 text-white text-sm px-4 py-2 rounded-full font-semibold transition-colors">Save</button>
              <button className="text-red-600 text-sm hover:text-red-700 transition-colors">Remove artist</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
