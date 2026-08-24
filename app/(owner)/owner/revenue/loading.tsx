export default function RevenueLoading() {
  return (
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-6 animate-pulse">
        <div className="h-8 w-32 bg-zinc-200 rounded" />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 h-24" />
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm h-80" />
      </div>
    </div>
  );
}
