"use client";

import { useState } from "react";

export default function BlacklistManager() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowForm(!showForm)}
        className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-2 rounded-full hover:bg-red-500/20"
      >
        + Block client
      </button>

      {showForm && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 max-w-md space-y-3">
          <div>
            <label className="text-sm text-zinc-400 block mb-1.5">Client email or phone</label>
            <input type="text" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-500" />
          </div>
          <div>
            <label className="text-sm text-zinc-400 block mb-1.5">Reason (internal only)</label>
            <input type="text" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-500" />
          </div>
          <div className="flex gap-2">
            <button className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-full font-semibold">Block</button>
            <button onClick={() => setShowForm(false)} className="text-sm text-zinc-400 px-4 py-2 hover:text-white">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400">
              <th className="text-left px-6 py-4 font-medium">Client</th>
              <th className="text-left px-6 py-4 font-medium">Blocked by</th>
              <th className="text-left px-6 py-4 font-medium">Date</th>
              <th className="text-left px-6 py-4 font-medium">Reason</th>
              <th className="px-6 py-4" />
            </tr>
          </thead>
          <tbody>
            <tr className="text-zinc-500 text-center">
              <td colSpan={5} className="px-6 py-8">No clients blocked</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
