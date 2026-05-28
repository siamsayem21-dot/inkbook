export default function OwnerBookingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">All Bookings</h1>
        <div className="flex gap-2">
          {["All", "Upcoming", "Completed", "Cancelled"].map((f) => (
            <button
              key={f}
              className={`text-sm px-3 py-1.5 rounded-full ${
                f === "All" ? "bg-white text-black" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400">
              <th className="text-left px-6 py-4 font-medium">Client</th>
              <th className="text-left px-6 py-4 font-medium">Artist</th>
              <th className="text-left px-6 py-4 font-medium">Date</th>
              <th className="text-left px-6 py-4 font-medium">Deposit</th>
              <th className="text-left px-6 py-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-zinc-800/50 text-zinc-300">
              <td className="px-6 py-4">—</td>
              <td className="px-6 py-4">—</td>
              <td className="px-6 py-4">—</td>
              <td className="px-6 py-4">—</td>
              <td className="px-6 py-4">—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
