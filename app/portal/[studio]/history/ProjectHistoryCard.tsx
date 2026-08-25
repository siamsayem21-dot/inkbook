"use client";

import { useState } from "react";
import Link from "next/link";
import type { ClientHistoryProject } from "@/lib/client-portal/history";
import { getProjectStatusMeta } from "@/lib/client-portal/project-status";
import { getBookingStatusMeta } from "@/lib/client-portal/booking-status";

interface Props {
  studioSlug: string;
  project: ClientHistoryProject;
  brandColor: string;
  textOnBrand: string;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function TranscriptBubble({ role, content, imageUrl }: { role: "user" | "assistant"; content: string; imageUrl: string | null }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
          isUser ? "bg-zinc-900 text-white rounded-br-sm" : "bg-zinc-100 text-zinc-700 rounded-bl-sm"
        }`}
      >
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="Reference" className="max-w-full max-h-40 rounded-lg mb-1.5 object-cover" />
        )}
        {content && <p className="whitespace-pre-wrap">{content}</p>}
      </div>
    </div>
  );
}

export default function ProjectHistoryCard({ studioSlug, project, brandColor, textOnBrand }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  const statusMeta = getProjectStatusMeta(project.status);
  const bookingMeta = project.booking ? getBookingStatusMeta(project.booking.status) : null;
  const lastActivity = project.timeline[project.timeline.length - 1];

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-left p-5 flex items-start justify-between gap-4 flex-wrap hover:bg-zinc-50 transition-colors"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-900 truncate">{project.title}</p>
          <div className="flex items-center gap-2 flex-wrap mt-2.5">
            <span className={`text-[10px] px-2 py-0.5 border rounded-full ${statusMeta.badge}`}>{statusMeta.label}</span>
            {bookingMeta && <span className={`text-[10px] px-2 py-0.5 border rounded-full ${bookingMeta.badge}`}>{bookingMeta.label}</span>}
          </div>
          {lastActivity && (
            <p className="text-[10px] text-zinc-400 mt-2.5">
              Last activity: {fmtDate(lastActivity.date)}
              {lastActivity.approximate ? " (approx.)" : ""}
            </p>
          )}
        </div>
        <span className="text-zinc-400 text-xs shrink-0">{expanded ? "Hide ▲" : "Details ▼"}</span>
      </button>

      {expanded && (
        <div className="border-t border-zinc-100 p-5 space-y-5">
          <div className="space-y-2.5">
            {project.timeline.map((entry) => (
              <div key={entry.key} className="flex items-center gap-3">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px]"
                  style={{ backgroundColor: brandColor, color: textOnBrand }}
                >
                  ✓
                </span>
                <span className="text-sm text-zinc-800">
                  {entry.label}
                  <span className="text-zinc-400 ml-2 text-xs">
                    {entry.approximate ? `around ${fmtDate(entry.date)}` : fmtDate(entry.date)}
                  </span>
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 text-[10px] uppercase tracking-widest font-semibold">
            <Link href={`/portal/${studioSlug}/projects/${project.id}`} className="text-zinc-500 hover:text-zinc-900 transition-colors">
              View Project →
            </Link>
            {project.booking && (
              <Link href={`/portal/${studioSlug}/bookings/${project.booking.id}`} className="text-zinc-500 hover:text-zinc-900 transition-colors">
                View Booking →
              </Link>
            )}
            {project.thread && (
              <Link href={`/portal/${studioSlug}/messages/${project.thread.id}`} className="text-zinc-500 hover:text-zinc-900 transition-colors">
                View Conversation →
              </Link>
            )}
          </div>

          {project.transcript.length > 0 && (
            <div className="pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setShowTranscript((s) => !s)}
                className="text-[10px] uppercase tracking-widest text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                {showTranscript ? "Hide AI Consultation Transcript ▲" : "Show AI Consultation Transcript ▼"}
              </button>
              {showTranscript && (
                <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
                  {project.transcript.map((m, i) => (
                    <TranscriptBubble key={i} role={m.role} content={m.content} imageUrl={m.imageUrl} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
