export default function NewArtistPage() {
  return (
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 max-w-xl space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Add artist</h1>
        <form className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 space-y-4">
          <div>
            <label htmlFor="new-artist-name" className="text-xs text-zinc-400 block mb-1.5">Full name</label>
            <input
              id="new-artist-name"
              type="text"
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-colors"
            />
          </div>
          <div>
            <label htmlFor="new-artist-email" className="text-xs text-zinc-400 block mb-1.5">Email</label>
            <input
              id="new-artist-email"
              type="email"
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-colors"
            />
          </div>
          <div>
            <label htmlFor="new-artist-rate" className="text-xs text-zinc-400 block mb-1.5">Minimum hourly rate ($)</label>
            <input
              id="new-artist-rate"
              type="number"
              placeholder="150"
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-colors"
            />
          </div>
          <div>
            <label htmlFor="new-artist-bio" className="text-xs text-zinc-400 block mb-1.5">Bio</label>
            <textarea
              id="new-artist-bio"
              rows={3}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-colors resize-none"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
          >
            Send invite
          </button>
        </form>
      </div>
    </div>
  );
}
