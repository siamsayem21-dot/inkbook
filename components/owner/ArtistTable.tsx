import Link from "next/link";

const placeholder = [
  { id: "1", name: "—", bookings: "—", revenue: "—", rate: "—", status: "Active" },
];

export default function ArtistTable() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-zinc-400">
            <th className="text-left px-6 py-4 font-medium">Artist</th>
            <th className="text-left px-6 py-4 font-medium">Bookings (mo)</th>
            <th className="text-left px-6 py-4 font-medium">Revenue (mo)</th>
            <th className="text-left px-6 py-4 font-medium">Min. rate</th>
            <th className="text-left px-6 py-4 font-medium">Status</th>
            <th className="px-6 py-4" />
          </tr>
        </thead>
        <tbody>
          {placeholder.map((a) => (
            <tr key={a.id} className="border-b border-zinc-800/50 text-zinc-300 hover:bg-zinc-800/20">
              <td className="px-6 py-4">{a.name}</td>
              <td className="px-6 py-4">{a.bookings}</td>
              <td className="px-6 py-4">{a.revenue}</td>
              <td className="px-6 py-4">{a.rate}</td>
              <td className="px-6 py-4">
                <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2.5 py-0.5 rounded-full">
                  {a.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <Link href={`/artists/${a.id}`} className="text-xs text-zinc-400 hover:text-white">
                  Manage →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
