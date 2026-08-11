"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";

interface Client {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  notes: string | null;
  created_at: string;
  bookingCount: number;
  hasConsent: boolean;
  isBlacklisted: boolean;
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

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ClientCard({ client }: { client: Client }) {
  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-5 ${client.isBlacklisted ? "border-red-200" : "border-zinc-200"}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-zinc-900">{client.full_name}</p>
            {client.isBlacklisted && (
              <Link
                href="/owner/blacklist"
                className="text-[10px] px-2 py-0.5 bg-red-50 text-red-700 rounded-full font-medium hover:bg-red-100 transition-colors"
              >
                Blocked
              </Link>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">{client.email} · {client.phone}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] px-2.5 py-1 bg-violet-50 text-violet-700 rounded-full font-medium tabular-nums">
            {client.bookingCount} booking{client.bookingCount === 1 ? "" : "s"}
          </span>
          {client.hasConsent && (
            <span className="text-[11px] px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full font-medium">
              Consent on file
            </span>
          )}
        </div>
      </div>

      {client.notes && (
        <p className="text-xs text-zinc-500 mt-3 pt-3 border-t border-zinc-100 leading-relaxed">
          {client.notes}
        </p>
      )}

      <p className="text-[11px] text-zinc-400 mt-3">Client since {fmtDate(client.created_at)}</p>
    </div>
  );
}

export default function ClientsTable({ clients: initial }: Props) {
  const [clients] = useState<Client[]>(initial);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q)
    );
  }, [clients, search]);

  const blockedCount = clients.filter((c) => c.isBlacklisted).length;

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
      const data = await res.json() as { imported?: number; skipped?: number; duplicates?: number; error?: string };

      if (!res.ok || data.error) {
        setStatus(`Import failed: ${data.error ?? "Unknown error"}`);
      } else {
        const parts: string[] = [];
        if ((data.imported ?? 0) > 0) parts.push(`${data.imported} clients imported successfully`);
        if ((data.duplicates ?? 0) > 0) parts.push(`${data.duplicates} already existed and were skipped`);
        if ((data.skipped ?? 0) > 0) parts.push(`${data.skipped} rows skipped (missing required fields)`);
        setStatus(parts.join(" · ") || "No changes made");

        if ((data.imported ?? 0) > 0) {
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
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Clients</h1>
            <p className="text-sm text-zinc-500 mt-1">
              {clients.length} total
              {blockedCount > 0 && (
                <span className="text-red-600 font-medium"> · {blockedCount} blocked</span>
              )}
            </p>
          </div>
          <label
            className={`text-sm font-semibold px-4 py-2.5 rounded-xl border cursor-pointer transition-colors ${
              importing
                ? "border-zinc-200 text-zinc-400 cursor-not-allowed"
                : "border-zinc-200 bg-white text-zinc-600 hover:border-violet-300 hover:text-violet-700"
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

        {/* Toolbar: search + CSV format hint + import status */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 sm:p-5 space-y-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone…"
            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-colors"
          />
          <p className="text-xs text-zinc-400">
            CSV format: <code className="bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded">name,email,phone</code> (header row required)
          </p>
          {status && (
            <p className={`text-xs px-3 py-2 rounded-lg ${
              status.includes("failed") || status.includes("must have")
                ? "bg-red-50 text-red-700"
                : "bg-emerald-50 text-emerald-700"
            }`}>
              {status}
            </p>
          )}
        </div>

        {/* Empty states */}
        {clients.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm px-6 py-16 text-center">
            <p className="text-base font-semibold text-zinc-900 mb-2">No Clients Yet</p>
            <p className="text-zinc-500 text-sm">Clients are added automatically when bookings are made, or import a CSV above.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm px-6 py-16 text-center">
            <p className="text-base font-semibold text-zinc-900 mb-2">No Matching Clients</p>
            <p className="text-zinc-500 text-sm">Nothing matches &quot;{search}&quot;.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((c) => (
              <ClientCard key={c.id} client={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
