export default function StudioSettingsPage() {
  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Studio profile</h1>
      <form className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <div>
          <label className="text-sm text-zinc-400 block mb-1.5">Studio name</label>
          <input type="text" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-500" />
        </div>
        <div>
          <label className="text-sm text-zinc-400 block mb-1.5">Subdomain</label>
          <div className="flex items-center">
            <input type="text" className="flex-1 bg-zinc-800 border border-zinc-700 rounded-l-lg px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-500" />
            <span className="bg-zinc-700 border border-l-0 border-zinc-700 rounded-r-lg px-3 py-2.5 text-sm text-zinc-400">.inkbook.app</span>
          </div>
        </div>
        <div>
          <label className="text-sm text-zinc-400 block mb-1.5">Address</label>
          <input type="text" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-500" />
        </div>
        <div>
          <label className="text-sm text-zinc-400 block mb-1.5">State (for consent form templates)</label>
          <select className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-500">
            <option value="">Select state</option>
            <option value="CA">California</option>
            <option value="TX">Texas</option>
            <option value="NY">New York</option>
            <option value="FL">Florida</option>
          </select>
        </div>
        <button type="submit" className="bg-white text-black text-sm px-5 py-2.5 rounded-full font-semibold hover:bg-zinc-200">
          Save changes
        </button>
      </form>
    </div>
  );
}
