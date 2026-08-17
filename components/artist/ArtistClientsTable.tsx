"use client";

import { useState } from "react";
import Link from "next/link";

export type ArtistClientRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  sessionCount: number;
  noShowCount: number;
  lastVisit: string | null;
};

function fmtDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ArtistClientsTable({ clients }: { clients: ArtistClientRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? clients.filter((c) => {
        const q = query.trim().toLowerCase();
        return c.fullName.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
      })
    : clients;

  if (clients.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm px-6 py-16 text-center">
        <p className="text-base font-semibold text-zinc-900 mb-2">No clients yet</p>
        <p className="text-zinc-500 text-sm">Clients you&apos;ve booked with will show up here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search clients…"
        className="w-full sm:w-72 bg-white border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-colors"
      />

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-zinc-400">
              <th className="text-left px-5 py-3 font-medium">Name</th>
              <th className="text-left px-5 py-3 font-medium">Sessions</th>
              <th className="text-left px-5 py-3 font-medium">Last visit</th>
              <th className="text-left px-5 py-3 font-medium">No-shows</th>
              <th className="text-left px-5 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-zinc-400">No matches for &quot;{query}&quot;</td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-zinc-900">{c.fullName}</p>
                    <p className="text-xs text-zinc-400">{c.email}</p>
                  </td>
                  <td className="px-5 py-3.5 text-zinc-700">{c.sessionCount}</td>
                  <td className="px-5 py-3.5 text-zinc-700">{fmtDate(c.lastVisit)}</td>
                  <td className="px-5 py-3.5">
                    {c.noShowCount > 0 ? (
                      <span className="text-xs font-medium bg-red-50 text-red-600 px-2 py-0.5 rounded-full">{c.noShowCount}</span>
                    ) : (
                      <span className="text-zinc-300">0</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link href={`/artist/clients/${c.id}`} className="text-xs text-violet-600 font-medium hover:text-violet-700">
                      View →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
