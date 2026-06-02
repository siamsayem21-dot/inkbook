"use client";

import { useState } from "react";
import Link from "next/link";

interface Props {
  artistsDone: boolean;
  linkDone: boolean;
  bookingLink: string;
}

export default function OnboardingChecklist({ artistsDone, linkDone, bookingLink }: Props) {
  const [copied, setCopied] = useState(false);

  const availDone = artistsDone;
  const allDone = artistsDone && linkDone;
  if (allDone) return null;

  async function handleCopy() {
    await navigator.clipboard.writeText(`https://${bookingLink}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const steps = [
    { key: "studio", label: "Studio created", done: true, type: "none" as const },
    { key: "artist", label: "Invite your first artist", done: artistsDone, type: "link" as const, href: "/owner/artists" },
    { key: "link",   label: "Share your booking link",  done: linkDone,    type: "copy" as const },
    { key: "avail",  label: "Set your availability",    done: availDone,   type: "link" as const, href: "/owner/schedule" },
  ];

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-zinc-200">Getting started</h2>
        <span className="text-xs text-zinc-500">{doneCount}/{steps.length} complete</span>
      </div>

      <div className="space-y-3.5">
        {steps.map((step) => (
          <div key={step.key} className="flex items-start gap-3">
            <div
              className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 text-[9px] font-bold ${
                step.done ? "bg-green-500 border-green-500 text-black" : "border-zinc-600"
              }`}
            >
              {step.done ? "✓" : ""}
            </div>

            <div className="flex-1 min-w-0">
              <span className={`text-sm ${step.done ? "text-zinc-500 line-through" : "text-zinc-200"}`}>
                {step.label}
              </span>

              {!step.done && step.type === "link" && "href" in step && (
                <Link href={step.href!} className="block text-xs text-gold/70 hover:text-gold mt-0.5">
                  Go →
                </Link>
              )}

              {step.type === "copy" && (
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <code className="text-xs text-gold bg-zinc-800 px-2 py-0.5 rounded font-mono break-all">
                    {bookingLink}
                  </code>
                  <button
                    onClick={handleCopy}
                    className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                      copied
                        ? "text-green-400 border-green-500/30"
                        : "text-zinc-400 border-zinc-700 hover:text-white hover:border-zinc-600"
                    }`}
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
