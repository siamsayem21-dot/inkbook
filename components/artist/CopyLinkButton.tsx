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
          ? "bg-green-50 border-green-200 text-green-700"
          : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300"
      }`}
    >
      {copied ? "Copied!" : "Copy Link"}
    </button>
  );
}
