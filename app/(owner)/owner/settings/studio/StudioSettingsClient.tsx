"use client";

import { useState } from "react";
import { saveStudio } from "./actions";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

export default function StudioSettingsClient({
  studioId,
  initialName,
  initialSubdomain,
  initialAddress,
  initialState,
}: {
  studioId: string;
  initialName: string;
  initialSubdomain: string;
  initialAddress: string;
  initialState: string;
}) {
  const [name, setName] = useState(initialName);
  const [address, setAddress] = useState(initialAddress);
  const [state, setState] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);

    const result = await saveStudio({ studioId, name, address, state });

    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
      {error && (
        <div className="bg-red-950 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div>
        <label className="text-sm text-zinc-400 block mb-1.5">Studio name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-500 transition-colors"
        />
      </div>

      <div>
        <label className="text-sm text-zinc-400 block mb-1.5">Subdomain (read-only)</label>
        <div className="flex items-center">
          <input
            type="text"
            value={initialSubdomain}
            readOnly
            className="flex-1 bg-zinc-800/50 border border-zinc-700 rounded-l-lg px-4 py-2.5 text-sm text-zinc-500 cursor-not-allowed"
          />
          <span className="bg-zinc-700/50 border border-l-0 border-zinc-700 rounded-r-lg px-3 py-2.5 text-sm text-zinc-500">
            .inkbook.app
          </span>
        </div>
        <p className="text-xs text-zinc-600 mt-1">Contact support to change your subdomain.</p>
      </div>

      <div>
        <label className="text-sm text-zinc-400 block mb-1.5">Address</label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="123 Main St, City"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-500 transition-colors"
        />
      </div>

      <div>
        <label className="text-sm text-zinc-400 block mb-1.5">State (drives consent form templates)</label>
        <select
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-500 transition-colors"
        >
          <option value="">Select state</option>
          {US_STATES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="bg-white text-black text-sm px-5 py-2.5 rounded-full font-semibold hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Saving…" : "Save changes"}
        </button>
        {saved && (
          <span className="text-sm text-green-400">Saved ✓</span>
        )}
      </div>
    </form>
  );
}
