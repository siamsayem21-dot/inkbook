export default function PipelineLoading() {
  return (
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-6 animate-pulse">
        <div className="h-8 w-40 bg-zinc-200 rounded" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-3">
              <div className="h-6 w-24 bg-zinc-200/70 rounded" />
              <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm h-28" />
              <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm h-28" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
