export default function ArtistDashboardLoading() {
  return (
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-8 animate-pulse">
        <div>
          <div className="h-8 w-48 bg-zinc-200 rounded" />
          <div className="h-4 w-64 bg-zinc-200/70 rounded mt-2" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5 h-28" />
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5 h-20" />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm h-72" />
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm h-72" />
        </div>
      </div>
    </div>
  );
}
