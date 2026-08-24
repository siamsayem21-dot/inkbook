export default function RequestsLoading() {
  return (
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-6 animate-pulse">
        <div className="h-8 w-36 bg-zinc-200 rounded" />

        <div className="flex flex-wrap gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-24 bg-zinc-200/70 rounded-full" />
          ))}
        </div>

        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-zinc-200 shadow-sm h-24" />
          ))}
        </div>
      </div>
    </div>
  );
}
