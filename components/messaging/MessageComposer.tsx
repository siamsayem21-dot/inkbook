"use client";

import { useRef } from "react";

interface Props {
  text: string;
  onTextChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  imagePreview: string | null;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
  sending: boolean;
  error: string | null;
  accentColor: string;
  textOnAccent: string;
}

// Extracted from app/portal/[studio]/consultation/ConsultationChat.tsx's
// composer so text/image/send behavior can't drift across the client, owner,
// and artist messaging surfaces (see ThreadView.tsx, which owns the
// optimistic-send state this component is controlled by).
export default function MessageComposer({
  text,
  onTextChange,
  onSubmit,
  imagePreview,
  onFileSelect,
  onRemoveImage,
  sending,
  error,
  accentColor,
  textOnAccent,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e as unknown as React.FormEvent);
    }
  }

  return (
    <div className="border-t border-white/[0.08] p-3">
      {error && (
        <div className="border border-red-800/60 text-red-400 text-xs px-3 py-2 bg-red-950/40 mb-2">{error}</div>
      )}

      {imagePreview && (
        <div className="mb-2 relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imagePreview} alt="Selected" className="h-16 w-16 object-cover rounded-lg border border-white/[0.1]" />
          <button
            type="button"
            onClick={onRemoveImage}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center"
            aria-label="Remove image"
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={onSubmit} className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            onFileSelect(e);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending}
          className="shrink-0 w-10 h-10 flex items-center justify-center border border-white/[0.1] text-zinc-400 hover:text-white hover:border-white/20 transition-colors disabled:opacity-40"
          aria-label="Attach image"
        >
          📎
        </button>
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => {
            onTextChange(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
          }}
          onKeyDown={handleKeyDown}
          disabled={sending}
          placeholder="Type your message…"
          className="flex-1 resize-none bg-zinc-900 border border-white/[0.1] px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none transition-colors disabled:opacity-50 max-h-[120px]"
        />
        <button
          type="submit"
          disabled={sending || (!text.trim() && !imagePreview)}
          className="shrink-0 text-xs font-bold uppercase tracking-widest px-4 h-10 transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ backgroundColor: accentColor, color: textOnAccent }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
