export default function SettingsLoading() {
  return (
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-6 animate-pulse">
        <div className="h-8 w-32 bg-zinc-200 rounded" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-zinc-200 shadow-sm h-32" />
          ))}
        </div>
      </div>
    </div>
  );
}
