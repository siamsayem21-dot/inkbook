export default function ArtistDashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div>
        <div className="h-8 w-48 bg-zinc-800 rounded" />
        <div className="h-4 w-64 bg-zinc-800/60 rounded mt-2" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-[#111] border border-[#1E1E1E] rounded-xl p-5 h-28" />
        ))}
      </div>

      <div className="bg-[#111] border border-[#1E1E1E] rounded-xl p-5 h-20" />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-[#111] border border-[#1E1E1E] rounded-xl h-72" />
        <div className="bg-[#111] border border-[#1E1E1E] rounded-xl h-72" />
      </div>
    </div>
  );
}
