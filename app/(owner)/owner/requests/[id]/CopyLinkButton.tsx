"use client";

import { useState } from "react";

export default function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers without clipboard API
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-xl px-3 py-2.5">
        <span className="text-xs text-zinc-500 truncate flex-1 font-mono">{url}</span>
        <button
          onClick={handleCopy}
          className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
            copied ? "bg-emerald-50 text-emerald-700" : "bg-violet-600 hover:bg-violet-700 text-white"
          }`}
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <p className="text-xs text-zinc-400">
        Send this link to the client — they&apos;ll see the quote and pay the deposit directly.
      </p>
    </div>
  );
}
