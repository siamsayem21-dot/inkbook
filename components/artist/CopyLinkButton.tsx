"use client";

import { useState } from "react";

export default function CopyLinkButton({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className={`shrink-0 text-sm px-4 py-2 rounded-lg border transition-colors cursor-pointer ${
        copied
          ? "bg-green-500/10 border-green-500/30 text-green-400"
          : "bg-[#c9a84c]/10 border-[#c9a84c]/30 text-[#c9a84c] hover:bg-[#c9a84c]/20"
      }`}
    >
      {copied ? "Copied!" : "Copy Link"}
    </button>
  );
}
