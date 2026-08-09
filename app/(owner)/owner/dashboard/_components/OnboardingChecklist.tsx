"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  artistsDone: boolean;
  linkDone: boolean;
  bookingLink: string;
}

// Compact by default — a single row with a progress ring, expandable on click.
// Disappears entirely once every step is done (allDone below), so it only
// takes dashboard space while it's actually useful to a new studio.
export default function OnboardingChecklist({ artistsDone, linkDone, bookingLink }: Props) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

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
    { key: "avail",  label: "Set your availability",    done: availDone,   type: "link" as const, href: "/owner/artists" },
  ];

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 transition-colors"
      >
        <div className="relative w-5 h-5 shrink-0">
          <svg viewBox="0 0 20 20" className="w-5 h-5 -rotate-90">
            <circle cx="10" cy="10" r="8" fill="none" stroke="#EDE9FE" strokeWidth="3" />
            <circle
              cx="10" cy="10" r="8" fill="none" stroke="#7C3AED" strokeWidth="3"
              strokeDasharray={`${(doneCount / steps.length) * 50.27} 50.27`}
              strokeLinecap="round"
            />
          </svg>
        </div>
        <span className="text-sm font-medium text-zinc-900">Getting started</span>
        <span className="text-xs text-zinc-400">{doneCount}/{steps.length} complete</span>
        <span className="flex-1" />
        {expanded ? <ChevronUp size={15} className="text-zinc-400" /> : <ChevronDown size={15} className="text-zinc-400" />}
      </button>

      {expanded && (
        <div className="px-5 pb-4 pt-1 space-y-3.5 border-t border-zinc-100">
          {steps.map((step) => (
            <div key={step.key} className="flex items-start gap-3 pt-3">
              <div
                className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 text-[9px] font-bold ${
                  step.done ? "bg-violet-600 border-violet-600 text-white" : "border-zinc-300"
                }`}
              >
                {step.done ? "✓" : ""}
              </div>

              <div className="flex-1 min-w-0">
                <span className={`text-sm ${step.done ? "text-zinc-400 line-through" : "text-zinc-800"}`}>
                  {step.label}
                </span>

                {!step.done && step.type === "link" && "href" in step && (
                  <Link href={step.href!} className="block text-xs text-violet-600 hover:text-violet-700 mt-0.5">
                    Go →
                  </Link>
                )}

                {step.type === "copy" && (
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <code className="text-xs text-violet-700 bg-violet-50 px-2 py-0.5 rounded font-mono break-all">
                      {bookingLink}
                    </code>
                    <button
                      onClick={handleCopy}
                      className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                        copied
                          ? "text-green-700 border-green-200 bg-green-50"
                          : "text-zinc-500 border-zinc-200 hover:text-zinc-900 hover:border-zinc-300"
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
      )}
    </div>
  );
}
