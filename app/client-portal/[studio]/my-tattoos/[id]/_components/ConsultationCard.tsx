"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import SectionCard from "./SectionCard";
import type { ProjectDetailData } from "../types";

interface Props {
  consultation: ProjectDetailData["consultation"];
}

function Bubble({ role, content, imageUrl }: { role: "user" | "assistant"; content: string; imageUrl: string | null }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser ? "bg-violet-600 text-white rounded-br-md" : "bg-zinc-100 text-zinc-800 rounded-bl-md"
        }`}
      >
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="Reference" className="max-w-full max-h-48 rounded-lg mb-2 object-cover" />
        )}
        {content && <p className="whitespace-pre-wrap">{content}</p>}
      </div>
    </div>
  );
}

export default function ConsultationCard({ consultation }: Props) {
  const [showTranscript, setShowTranscript] = useState(false);

  return (
    <SectionCard id="consultation" icon={MessageSquare} title="Consultation">
      <p className="text-sm text-zinc-700 leading-relaxed">{consultation.summary}</p>

      {consultation.notes && (
        <div className="mt-4 pt-4 border-t border-zinc-100">
          <p className="text-xs text-zinc-400 mb-1">Client Notes</p>
          <p className="text-sm text-zinc-600 leading-relaxed">{consultation.notes}</p>
        </div>
      )}

      {consultation.referenceImages.length > 0 && (
        <div className="mt-4 pt-4 border-t border-zinc-100">
          <p className="text-xs text-zinc-400 mb-2">Reference Images</p>
          <div className="flex flex-wrap gap-2">
            {consultation.referenceImages.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt={`Reference ${i + 1}`} className="w-20 h-20 object-cover rounded-lg border border-zinc-200" />
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center justify-between">
        <span className="text-xs text-zinc-400">Status: <span className="text-zinc-600 font-medium">{consultation.statusLabel}</span></span>
        {consultation.transcript ? (
          <button
            type="button"
            onClick={() => setShowTranscript((s) => !s)}
            className="text-xs font-semibold text-violet-600 hover:text-violet-700 transition-colors"
          >
            {showTranscript ? "Hide Full Conversation" : "View Full Conversation →"}
          </button>
        ) : (
          <span className="text-xs text-zinc-300">Conversation not available</span>
        )}
      </div>

      {showTranscript && consultation.transcript && (
        <div className="mt-4 space-y-2.5 max-h-80 overflow-y-auto pr-1">
          {consultation.transcript.map((m, i) => (
            <Bubble key={i} role={m.role} content={m.content} imageUrl={m.imageUrl} />
          ))}
        </div>
      )}
    </SectionCard>
  );
}
