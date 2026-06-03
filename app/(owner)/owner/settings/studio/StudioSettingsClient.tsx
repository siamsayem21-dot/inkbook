"use client";

import { useState, useRef } from "react";
import { saveStudio, uploadLogo } from "./actions";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

const FONT_OPTIONS = [
  { value: "default", label: "Default (Cinzel serif)" },
  { value: "bold",    label: "Bold (Cinzel heavy)" },
  { value: "elegant", label: "Elegant (Clean sans-serif)" },
];

export default function StudioSettingsClient({
  studioId,
  initialName,
  initialSubdomain,
  initialAddress,
  initialState,
  initialLogoUrl,
  initialPrimaryColor,
  initialSecondaryColor,
  initialFontChoice,
}: {
  studioId: string;
  initialName: string;
  initialSubdomain: string;
  initialAddress: string;
  initialState: string;
  initialLogoUrl: string;
  initialPrimaryColor: string;
  initialSecondaryColor: string;
  initialFontChoice: string;
}) {
  const [name, setName]               = useState(initialName);
  const [address, setAddress]         = useState(initialAddress);
  const [state, setState]             = useState(initialState);
  const [primaryColor, setPrimaryColor]     = useState(initialPrimaryColor);
  const [secondaryColor, setSecondaryColor] = useState(initialSecondaryColor);
  const [fontChoice, setFontChoice]   = useState(initialFontChoice);
  const [logoUrl, setLogoUrl]         = useState(initialLogoUrl);

  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [saved, setSaved]             = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError]     = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);

    const result = await saveStudio({
      studioId,
      name,
      address,
      state,
      primaryColor,
      secondaryColor,
      fontChoice,
    });

    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    setLogoError(null);

    const fd = new FormData();
    fd.append("studioId", studioId);
    fd.append("file", file);

    const result = await uploadLogo(fd);
    setLogoUploading(false);

    if (result.error) {
      setLogoError(result.error);
    } else if (result.url) {
      setLogoUrl(result.url);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
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

      {/* Branding */}
      <div className="border-t border-zinc-800 pt-5 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-200">Branding</h3>

        {/* Logo upload */}
        <div>
          <label className="text-sm text-zinc-400 block mb-1.5">Studio Logo</label>
          <div className="flex items-center gap-4">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Studio logo"
                className="w-14 h-14 object-cover rounded border border-zinc-700"
              />
            ) : (
              <div className="w-14 h-14 bg-zinc-800 border border-zinc-700 rounded flex items-center justify-center shrink-0">
                <span className="text-zinc-600 text-xs">No logo</span>
              </div>
            )}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleLogoChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={logoUploading}
                className="text-sm px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {logoUploading ? "Uploading…" : logoUrl ? "Change Logo" : "Upload Logo"}
              </button>
              <p className="text-xs text-zinc-600 mt-1">JPG, PNG, WebP · max 2 MB</p>
              {logoError && <p className="text-red-400 text-xs mt-1">{logoError}</p>}
            </div>
          </div>
        </div>

        {/* Color pickers */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-zinc-400 block mb-1.5">Primary Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#D4AF37"
                maxLength={7}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-zinc-500 transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-zinc-400 block mb-1.5">Secondary Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0"
              />
              <input
                type="text"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                placeholder="#FFFFFF"
                maxLength={7}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-zinc-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Font selector */}
        <div>
          <label className="text-sm text-zinc-400 block mb-1.5">Font Style</label>
          <select
            value={fontChoice}
            onChange={(e) => setFontChoice(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-500 transition-colors"
          >
            {FONT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
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
