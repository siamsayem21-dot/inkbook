"use client";

import { useState } from "react";
import { updateDisplayName } from "./actions";

interface Props {
  initialName: string;
}

// Mirrors app/(owner)/owner/settings/studio/StudioSettingsClient.tsx's save
// pattern: local state seeded from the server, a save action, and a transient
// "Saved ✓" indicator — no toast library used anywhere in this codebase.
export default function SettingsForm({ initialName }: Props) {
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);

    const result = await updateDisplayName(name);

    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="px-6 py-4">
      <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2">Display Name</p>
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add your name"
          maxLength={100}
          className="flex-1 min-w-[180px] bg-zinc-900 border border-white/[0.1] px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={loading}
          className="text-[10px] uppercase tracking-widest font-semibold px-4 py-2.5 bg-white text-black transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save"}
        </button>
        {saved && <span className="text-xs text-emerald-400">Saved ✓</span>}
      </div>
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </form>
  );
}
