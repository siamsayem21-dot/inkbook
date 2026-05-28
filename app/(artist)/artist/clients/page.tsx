export default function ArtistClientsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Clients</h1>
        <input
          type="search"
          placeholder="Search clients…"
          className="bg-zinc-800 border border-zinc-700 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 w-60"
        />
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400">
              <th className="text-left px-6 py-4 font-medium">Name</th>
              <th className="text-left px-6 py-4 font-medium">Sessions</th>
              <th className="text-left px-6 py-4 font-medium">Last visit</th>
              <th className="text-left px-6 py-4 font-medium">No-shows</th>
              <th className="text-left px-6 py-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr className="text-zinc-500 text-center">
              <td colSpan={5} className="px-6 py-8">No clients yet</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
