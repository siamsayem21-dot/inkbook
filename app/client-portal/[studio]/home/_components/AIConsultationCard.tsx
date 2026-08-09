"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Sparkles, ImagePlus, Mic, Send, X } from "lucide-react";
import type { MockChatMessage } from "../mock-data";

interface Props {
  seedMessages: MockChatMessage[];
  clientName: string;
  studioSlug: string;
}

function AiAvatar() {
  return (
    <span className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0">
      <span className="w-2 h-2 rounded-full bg-white" />
    </span>
  );
}

function timeNow(): string {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date());
}

// The transcript below is a UI-only preview (seeded + locally appended) — not
// yet wired to lib/ai-consultation's real chat engine. "Start a Consultation"
// intentionally links out to the real, backend-wired flow at
// app/portal/[studio]/consultation instead of faking one here.
export default function AIConsultationCard({ seedMessages, clientName, studioSlug }: Props) {
  const [messages, setMessages] = useState<MockChatMessage[]>(seedMessages);
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed && !imagePreview) return;
    setMessages((m) => [...m, { id: `local-${Date.now()}`, role: "user", content: trimmed, time: timeNow() }]);
    setText("");
    removeImage();
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm h-full flex flex-col overflow-hidden">
      <div className="px-7 pt-7 pb-5 relative border-b border-zinc-100">
        <span className="absolute top-6 right-6 inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 bg-violet-50 px-3 py-1.5 rounded-full">
          <Sparkles size={13} />
          InkBook AI
        </span>
        <h2 className="text-[28px] leading-tight font-bold text-zinc-900 mb-2.5 max-w-[75%]">Ready for your next tattoo?</h2>
        <p className="text-sm text-zinc-500 max-w-md mb-5 leading-relaxed">
          Start a consultation and InkBook AI will help you define your idea, size, placement, and preferences.
        </p>
        <Link
          href={`/portal/${studioSlug}/consultation`}
          className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-[15px] font-semibold rounded-xl px-6 py-3.5 transition-colors shadow-sm shadow-violet-200"
        >
          Start a Consultation
          <Sparkles size={16} />
        </Link>
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-7 py-5 space-y-4">
        {messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <div key={m.id} className={`flex items-end gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}>
              {!isUser && <AiAvatar />}
              <div className={`max-w-[78%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
                <div
                  className={`rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${
                    isUser
                      ? "bg-violet-600 text-white rounded-br-md"
                      : "bg-zinc-100 text-zinc-800 rounded-bl-md"
                  }`}
                >
                  {m.content}
                </div>
                <span className="text-[11px] text-zinc-400 mt-1 px-1">{m.time}</span>
              </div>
              {isUser && (
                <span className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-white text-[11px] font-semibold flex items-center justify-center shrink-0">
                  {clientName.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-zinc-100 p-4">
        {imagePreview && (
          <div className="mb-2.5 relative w-fit ml-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagePreview} alt="Selected reference" className="h-16 w-16 object-cover rounded-lg border border-zinc-200" />
            <button
              type="button"
              onClick={removeImage}
              aria-label="Remove image"
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center"
            >
              <X size={11} />
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex items-end gap-2.5">
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileSelect} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach reference image"
            className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <ImagePlus size={19} />
          </button>
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder="Reply to InkBook AI…"
            className="flex-1 resize-none bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-[14px] text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-colors max-h-[120px]"
          />
          <button
            type="button"
            aria-label="Voice input (coming soon)"
            disabled
            title="Coming soon"
            className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-zinc-300 cursor-not-allowed"
          >
            <Mic size={19} />
          </button>
          <button
            type="submit"
            disabled={!text.trim() && !imagePreview}
            aria-label="Send message"
            className="shrink-0 w-11 h-11 rounded-full bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white flex items-center justify-center transition-colors"
          >
            <Send size={17} />
          </button>
        </form>
      </div>
    </div>
  );
}
