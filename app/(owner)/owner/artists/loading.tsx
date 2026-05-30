export default function ArtistsLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-36 bg-zinc-800 rounded" />
          <div className="h-6 w-8 bg-zinc-800 rounded-full" />
        </div>
        <div className="h-9 w-32 bg-zinc-800 rounded-lg" />
      </div>

      <div className="bg-[#111] border border-[#1E1E1E] rounded-xl overflow-hidden">
        <div className="border-b border-[#1E1E1E] px-5 py-3.5 flex gap-10">
          {[100, 180, 60, 80].map((w, i) => (
            <div key={i} className="h-3 bg-zinc-800 rounded" style={{ width: w }} />
          ))}
        </div>
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="border-b border-[#161616] last:border-0 px-5 py-4 flex items-center gap-4"
          >
            <div className="w-9 h-9 rounded-full bg-zinc-800 shrink-0" />
            <div className="h-4 w-32 bg-zinc-800 rounded" />
            <div className="h-4 w-48 bg-zinc-800 rounded ml-2" />
            <div className="h-5 w-16 bg-zinc-800 rounded-full ml-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
