"use client";

import { useRef } from "react";

// Owner-only light/violet fork of components/messaging/MessageComposer.tsx —
// see OwnerThreadList.tsx for why this project forks the shared dark
// component instead of theming it in place. Same props/behavior, visuals only.
interface Props {
  text: string;
  onTextChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  imagePreview: string | null;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
  sending: boolean;
  error: string | null;
}

export default function OwnerMessageComposer({
  text,
  onTextChange,
  onSubmit,
  imagePreview,
  onFileSelect,
  onRemoveImage,
  sending,
  error,
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
    <div className="border-t border-zinc-100 p-3">
      {error && (
        <div className="border border-red-200 text-red-600 text-xs px-3 py-2 bg-red-50 rounded-lg mb-2">{error}</div>
      )}

      {imagePreview && (
        <div className="mb-2 relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imagePreview} alt="Selected" className="h-16 w-16 object-cover rounded-lg border border-zinc-200" />
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
          className="shrink-0 w-10 h-10 flex items-center justify-center border border-zinc-200 rounded-lg text-zinc-400 hover:text-zinc-700 hover:border-zinc-300 transition-colors disabled:opacity-40"
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
          className="flex-1 resize-none bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-colors disabled:opacity-50 max-h-[120px] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        />
        <button
          type="submit"
          disabled={sending || (!text.trim() && !imagePreview)}
          className="shrink-0 text-xs font-semibold px-4 h-10 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}
