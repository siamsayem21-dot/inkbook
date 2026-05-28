export default function AgreementsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Session Agreements</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Sent at the start of each session to lock in scope. Protects against last-minute design changes.
        </p>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400">
              <th className="text-left px-6 py-4 font-medium">Client</th>
              <th className="text-left px-6 py-4 font-medium">Booking date</th>
              <th className="text-left px-6 py-4 font-medium">Design agreed</th>
              <th className="text-left px-6 py-4 font-medium">Signed</th>
              <th className="text-left px-6 py-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr className="text-zinc-500 text-center">
              <td colSpan={5} className="px-6 py-8">No session agreements yet</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
