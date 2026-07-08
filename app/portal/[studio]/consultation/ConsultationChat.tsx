"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { sendMessage } from "./actions";
import ProjectTimeline from "../_components/ProjectTimeline";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  image_url: string | null;
};

interface Props {
  studioSlug: string;
  studioName: string;
  chatId: string;
  initialMessages: ChatMessage[];
  brandColor: string;
  textOnBrand: string;
}

function TypingIndicator({ brandColor }: { brandColor: string }) {
  return (
    <div data-testid="typing-indicator" className="flex items-center gap-1.5 px-4 py-3 bg-zinc-800/60 rounded-2xl rounded-bl-sm w-fit">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full animate-bounce"
          style={{ backgroundColor: brandColor, animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

function Bubble({ message, brandColor, textOnBrand }: { message: ChatMessage; brandColor: string; textOnBrand: string }) {
  const isUser = message.role === "user";
  return (
    <div data-testid="chat-message" data-role={message.role} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 ${isUser ? "rounded-br-sm" : "rounded-bl-sm bg-zinc-800/60 text-zinc-100"}`}
        style={isUser ? { backgroundColor: brandColor, color: textOnBrand } : undefined}
      >
        {message.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={message.image_url}
            alt="Reference"
            className="max-w-full max-h-64 rounded-lg mb-2 object-cover"
          />
        )}
        {message.content && <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>}
      </div>
    </div>
  );
}

export default function ConsultationChat({ studioSlug, studioName, chatId, initialMessages, brandColor, textOnBrand }: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    return () => { if (imagePreview) URL.revokeObjectURL(imagePreview); };
  }, [imagePreview]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed && !imageFile) return;
    if (sending) return;

    setError(null);
    setSending(true);

    const optimisticImageUrl = imagePreview;
    const optimisticId = `optimistic-${Date.now()}`;
    setMessages((m) => [...m, { id: optimisticId, role: "user", content: trimmed, image_url: optimisticImageUrl }]);

    const fd = new FormData();
    fd.append("content", trimmed);
    if (imageFile) fd.append("image", imageFile);

    setText("");
    const sentFile = imageFile;
    removeImage();
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const result = await sendMessage(chatId, fd);
    setSending(false);

    if ("error" in result) {
      setError(result.error);
      setMessages((m) => m.filter((msg) => msg.id !== optimisticId));
      setText(trimmed);
      setImageFile(sentFile);
      return;
    }

    setMessages((m) => [
      ...m.filter((msg) => msg.id !== optimisticId),
      { id: result.userMessage.id, role: "user", content: result.userMessage.content, image_url: result.userMessage.image_url },
      { id: result.assistantMessage.id, role: "assistant", content: result.assistantMessage.content, image_url: null },
    ]);

    if (result.complete && result.consultationId) {
      setComplete(true);
      setConsultationId(result.consultationId);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  if (complete) {
    return (
      <div data-testid="consultation-success" className="text-center py-6">
        <div
          className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center text-2xl"
          style={{ background: `${brandColor}20`, border: `1px solid ${brandColor}40` }}
        >
          ✓
        </div>
        <h2 className="font-serif text-2xl md:text-3xl tracking-wide mb-2">Consultation Submitted!</h2>
        <p className="text-zinc-400 text-sm leading-relaxed mb-8 max-w-sm mx-auto">
          Thank you. Your consultation has been sent to {studioName} and they&apos;ll review it shortly.
        </p>
        <div className="max-w-md mx-auto text-left mb-8">
          <ProjectTimeline status="new" brandColor={brandColor} />
        </div>
        <button
          type="button"
          onClick={() => router.push(`/portal/${studioSlug}/dashboard`)}
          className="text-sm font-bold uppercase tracking-widest px-8 py-3.5 transition-opacity hover:opacity-90"
          style={{ backgroundColor: brandColor, color: textOnBrand }}
        >
          Back to Dashboard →
        </button>
        {consultationId && (
          <p className="text-zinc-700 text-[10px] font-mono mt-6">Reference: {consultationId}</p>
        )}
      </div>
    );
  }

  return (
    <div className="border border-white/[0.08] bg-zinc-900/30 flex flex-col h-[75vh] md:h-[70vh]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m) => (
          <Bubble key={m.id} message={m} brandColor={brandColor} textOnBrand={textOnBrand} />
        ))}
        {sending && <TypingIndicator brandColor={brandColor} />}
      </div>

      <div className="border-t border-white/[0.08] p-3">
        {error && (
          <div className="border border-red-800/60 text-red-400 text-xs px-3 py-2 bg-red-950/40 mb-2">
            {error}
          </div>
        )}

        {imagePreview && (
          <div className="mb-2 relative w-fit">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagePreview} alt="Selected" className="h-16 w-16 object-cover rounded-lg border border-white/[0.1]" />
            <button
              type="button"
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center"
              aria-label="Remove image"
            >
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileSelect} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            className="shrink-0 w-10 h-10 flex items-center justify-center border border-white/[0.1] text-zinc-400 hover:text-white hover:border-white/20 transition-colors disabled:opacity-40"
            aria-label="Attach reference image"
          >
            📎
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
            disabled={sending}
            placeholder="Type your message…"
            className="flex-1 resize-none bg-zinc-900 border border-white/[0.1] px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[var(--brand-primary)] transition-colors disabled:opacity-50 max-h-[120px]"
          />
          <button
            type="submit"
            disabled={sending || (!text.trim() && !imageFile)}
            className="shrink-0 text-xs font-bold uppercase tracking-widest px-4 h-10 transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: brandColor, color: textOnBrand }}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
