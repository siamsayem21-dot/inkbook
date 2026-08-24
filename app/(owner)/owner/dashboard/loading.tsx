export default function OwnerDashboardLoading() {
  return (
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-6 animate-pulse">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="h-8 w-56 bg-zinc-200 rounded" />
          <div className="h-9 w-40 bg-zinc-200/70 rounded-full" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 h-24" />
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm h-72" />
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm h-72" />
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm h-40" />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm h-64" />
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm h-64" />
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm h-32" />
      </div>
    </div>
  );
}
