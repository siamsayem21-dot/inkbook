export default function WaitlistPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Waitlist</h1>
          <p className="text-zinc-400 text-sm mt-1">Clients added when artists are fully booked for the month.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-400">Monthly cap per artist:</span>
          <input
            type="number"
            defaultValue={20}
            className="w-20 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
          />
        </div>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400">
              <th className="text-left px-6 py-4 font-medium">Client</th>
              <th className="text-left px-6 py-4 font-medium">Requested artist</th>
              <th className="text-left px-6 py-4 font-medium">Style</th>
              <th className="text-left px-6 py-4 font-medium">Added</th>
              <th className="text-left px-6 py-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr className="text-zinc-500 text-center">
              <td colSpan={5} className="px-6 py-8">No clients on waitlist</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
