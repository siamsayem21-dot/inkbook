"use client";

import { useEffect, useRef, useState } from "react";
import MessageComposer from "./MessageComposer";

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
  // Display label for bubbles NOT sent by the current viewer, keyed by
  // sender_role — e.g. { client: "Alex", owner: "Ink & Iron", artist: "Jane" }.
  labels: Partial<Record<SenderRole, string>>;
  sendAction: (threadId: string, formData: FormData) => Promise<SendMessageResult>;
  accentColor: string;
  textOnAccent: string;
}

function Bubble({
  message,
  mine,
  label,
  accentColor,
  textOnAccent,
}: {
  message: ThreadMessage;
  mine: boolean;
  label?: string;
  accentColor: string;
  textOnAccent: string;
}) {
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[85%] sm:max-w-[75%]">
        {!mine && label && (
          <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1 px-1">{label}</p>
        )}
        <div
          className={`rounded-2xl px-4 py-2.5 ${mine ? "rounded-br-sm" : "rounded-bl-sm bg-zinc-800/60 text-zinc-100"}`}
          style={mine ? { backgroundColor: accentColor, color: textOnAccent } : undefined}
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

// Optimistic-append send pattern lifted directly from
// app/portal/[studio]/consultation/ConsultationChat.tsx, generalized from a
// fixed 2-role (user/assistant) chat to any of the 3 messaging roles. No
// realtime/polling — the other party's replies appear on next page load,
// per the confirmed v1 scope (see the messaging implementation plan §7).
export default function ThreadView({
  threadId,
  currentRole,
  initialMessages,
  labels,
  sendAction,
  accentColor,
  textOnAccent,
}: Props) {
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
    <div className="border border-white/[0.08] bg-zinc-900/30 flex flex-col h-[75vh] md:h-[70vh]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-zinc-600 text-sm text-center py-8">No messages yet — say hello.</p>
        )}
        {messages.map((m) => (
          <Bubble
            key={m.id}
            message={m}
            mine={m.sender_role === currentRole}
            label={labels[m.sender_role]}
            accentColor={accentColor}
            textOnAccent={textOnAccent}
          />
        ))}
      </div>

      <MessageComposer
        text={text}
        onTextChange={setText}
        onSubmit={handleSubmit}
        imagePreview={imagePreview}
        onFileSelect={handleFileSelect}
        onRemoveImage={removeImage}
        sending={sending}
        error={error}
        accentColor={accentColor}
        textOnAccent={textOnAccent}
      />
    </div>
  );
}
