export default function MessagesLoading() {
  return (
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-6 animate-pulse">
        <div className="h-8 w-36 bg-zinc-200 rounded" />

        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 border-b border-zinc-100 last:border-0" />
          ))}
        </div>
      </div>
    </div>
  );
}
