export default function NewArtistPage() {
  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Add artist</h1>
      <form className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <div>
          <label className="text-sm text-zinc-400 block mb-1.5">Full name</label>
          <input type="text" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-500" />
        </div>
        <div>
          <label className="text-sm text-zinc-400 block mb-1.5">Email</label>
          <input type="email" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-500" />
        </div>
        <div>
          <label className="text-sm text-zinc-400 block mb-1.5">Minimum hourly rate ($)</label>
          <input type="number" placeholder="150" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-500" />
        </div>
        <div>
          <label className="text-sm text-zinc-400 block mb-1.5">Bio</label>
          <textarea rows={3} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-500 resize-none" />
        </div>
        <button type="submit" className="w-full bg-white text-black font-semibold py-2.5 rounded-lg hover:bg-zinc-200">
          Send invite
        </button>
      </form>
    </div>
  );
}
