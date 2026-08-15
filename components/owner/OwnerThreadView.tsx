"use client";

import { useEffect, useRef, useState } from "react";
import OwnerMessageComposer from "./OwnerMessageComposer";

// Owner-only light/violet fork of components/messaging/ThreadView.tsx — see
// OwnerThreadList.tsx for why this project forks the shared dark component
// instead of theming it in place. Same props/behavior (including the
// optimistic-append send pattern), visuals only.
export type SenderRole = "client" | "owner" | "artist";

export type ThreadMessage = {
  id: string;
  sender_role: SenderRole;
  content: string;
  image_url: string | null;
  created_at: string;
};

export type SendMessageResult = { message?: ThreadMessage; error?: string };

interface Props {
  threadId: string;
  currentRole: SenderRole;
  initialMessages: ThreadMessage[];
  labels: Partial<Record<SenderRole, string>>;
  sendAction: (threadId: string, formData: FormData) => Promise<SendMessageResult>;
}

function Bubble({ message, mine, label }: { message: ThreadMessage; mine: boolean; label?: string }) {
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[85%] sm:max-w-[75%]">
        {!mine && label && (
          <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1 px-1">{label}</p>
        )}
        <div
          className={`rounded-2xl px-4 py-2.5 ${
            mine ? "rounded-br-sm bg-violet-600 text-white" : "rounded-bl-sm bg-zinc-100 text-zinc-800"
          }`}
        >
          {message.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={message.image_url}
              alt="Attachment"
              className="max-w-full max-h-64 rounded-lg mb-2 object-cover"
            />
          )}
          {message.content && <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>}
        </div>
      </div>
    </div>
  );
}

export default function OwnerThreadView({ threadId, currentRole, initialMessages, labels, sendAction }: Props) {
  const [messages, setMessages] = useState<ThreadMessage[]>(initialMessages);
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
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
    setMessages((m) => [
      ...m,
      { id: optimisticId, sender_role: currentRole, content: trimmed, image_url: optimisticImageUrl, created_at: new Date().toISOString() },
    ]);

    const fd = new FormData();
    fd.append("content", trimmed);
    if (imageFile) fd.append("image", imageFile);

    setText("");
    const sentFile = imageFile;
    removeImage();

    const result = await sendAction(threadId, fd);
    setSending(false);

    if (result.error || !result.message) {
      setError(result.error ?? "Failed to send message — please try again.");
      setMessages((m) => m.filter((msg) => msg.id !== optimisticId));
      setText(trimmed);
      setImageFile(sentFile);
      return;
    }

    setMessages((m) => [...m.filter((msg) => msg.id !== optimisticId), result.message!]);
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col h-[75vh] md:h-[70vh]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-zinc-400 text-sm text-center py-8">No messages yet — say hello.</p>
        )}
        {messages.map((m) => (
          <Bubble key={m.id} message={m} mine={m.sender_role === currentRole} label={labels[m.sender_role]} />
        ))}
      </div>

      <OwnerMessageComposer
        text={text}
        onTextChange={setText}
        onSubmit={handleSubmit}
        imagePreview={imagePreview}
        onFileSelect={handleFileSelect}
        onRemoveImage={removeImage}
        sending={sending}
        error={error}
      />
    </div>
  );
}
