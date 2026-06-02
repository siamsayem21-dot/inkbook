"use client";

import { useRef, useState } from "react";

interface Client {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  created_at: string;
}

interface Props {
  clients: Client[];
}

function parseCsv(text: string): { name?: string; email?: string; phone?: string }[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const nameIdx  = header.indexOf("name");
  const emailIdx = header.indexOf("email");
  const phoneIdx = header.indexOf("phone");

  if (nameIdx === -1 || emailIdx === -1 || phoneIdx === -1) return [];

  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    return {
      name:  cols[nameIdx],
      email: cols[emailIdx],
      phone: cols[phoneIdx],
    };
  });
}

export default function ClientsTable({ clients: initial }: Props) {
  const [clients] = useState<Client[]>(initial);
  const [status, setStatus] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setStatus(null);

    const text = await file.text();
    const rows = parseCsv(text);

    if (rows.length === 0) {
      setStatus("CSV must have a header row with columns: name, email, phone");
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    try {
      const res = await fetch("/api/owner/clients/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json() as { imported?: number; skipped?: number; error?: string };

      if (!res.ok || data.error) {
        setStatus(`Import failed: ${data.error ?? "Unknown error"}`);
      } else {
        const parts: string[] = [];
        if ((data.imported ?? 0) > 0) parts.push(`${data.imported} clients imported successfully`);
        if ((data.skipped ?? 0) > 0) parts.push(`${data.skipped} rows skipped (missing required fields)`);
        setStatus(parts.join(" · ") || "No changes made");

        if ((data.imported ?? 0) > 0) {
          // Refresh client list — in a real app you'd router.refresh(), here we re-fetch
          window.location.reload();
        }
      }
    } catch {
      setStatus("Network error — please try again");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-zinc-400">{clients.length} client{clients.length !== 1 ? "s" : ""}</p>
        <div className="flex items-center gap-3">
          {status && (
            <span
              className={`text-xs px-3 py-1.5 rounded-lg border ${
                status.includes("failed") || status.includes("error") || status.includes("must have")
                  ? "bg-red-500/10 border-red-500/20 text-red-400"
                  : "bg-green-500/10 border-green-500/20 text-green-400"
              }`}
            >
              {status}
            </span>
          )}
          <label
            className={`text-sm px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
              importing
                ? "border-zinc-700 text-zinc-600 cursor-not-allowed"
                : "border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white"
            }`}
          >
            {importing ? "Importing…" : "Import CSV"}
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              disabled={importing}
              onChange={handleFileChange}
            />
          </label>
        </div>
      </div>

      {/* CSV format hint */}
      <p className="text-xs text-zinc-600">
        CSV format: <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">name,email,phone</code> (header row required)
      </p>

      {/* Table */}
      {clients.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-10 text-center">
          <p className="text-zinc-400 text-sm mb-1">No clients yet</p>
          <p className="text-zinc-600 text-xs">Clients are added automatically when bookings are made, or import via CSV.</p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left">
                  <th className="px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-wider">Phone</th>
                  <th className="px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-wider hidden sm:table-cell">Added</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3 text-zinc-200 font-medium">{c.full_name}</td>
                    <td className="px-4 py-3 text-zinc-400">{c.email}</td>
                    <td className="px-4 py-3 text-zinc-400">{c.phone}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs hidden sm:table-cell">
                      {new Date(c.created_at).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
