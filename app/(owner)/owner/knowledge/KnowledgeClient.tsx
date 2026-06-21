"use client";

import { useState, useTransition } from "react";
import {
  createKnowledgeEntry,
  updateKnowledgeEntry,
  deleteKnowledgeEntry,
  toggleKnowledgeActive,
  type KnowledgeCategory,
} from "./actions";
import type { KnowledgeEntry } from "@/lib/studio-knowledge";

const CATEGORIES: { value: KnowledgeCategory; label: string; description: string }[] = [
  { value: "policy",  label: "Policy",            description: "Cancellation, deposit, aftercare, no-show rules" },
  { value: "faq",     label: "FAQ",               description: "Common client questions — optionally shown on booking page" },
  { value: "style",   label: "Style & Specialties", description: "Styles you do and don't take, artist strengths" },
  { value: "pricing", label: "Pricing Context",   description: "Hourly rate, minimums, what drives your pricing" },
  { value: "general", label: "General",           description: "Studio hours, location notes, booking process" },
];

const CATEGORY_COLOR: Record<KnowledgeCategory, string> = {
  policy:  "bg-red-500/10 text-red-300 border-red-500/20",
  faq:     "bg-blue-500/10 text-blue-300 border-blue-500/20",
  style:   "bg-purple-500/10 text-purple-300 border-purple-500/20",
  pricing: "bg-[#c9a84c]/10 text-[#c9a84c] border-[#c9a84c]/20",
  general: "bg-zinc-800 text-zinc-400 border-zinc-700",
};

const inputCls = "w-full bg-zinc-900 border border-zinc-800 text-white text-sm rounded-lg px-4 py-2.5 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors";
const textareaCls = `${inputCls} resize-none`;

type EditState = { id: string; title: string; content: string; isPublic: boolean; isActive: boolean } | null;

function AddEntryForm({
  onSaved,
}: {
  onSaved: (entry: KnowledgeEntry) => void;
}) {
  const [open, setOpen]           = useState(false);
  const [category, setCategory]   = useState<KnowledgeCategory>("policy");
  const [title, setTitle]         = useState("");
  const [content, setContent]     = useState("");
  const [isPublic, setIsPublic]   = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [isPending, startTrans]   = useTransition();

  function reset() {
    setTitle(""); setContent(""); setIsPublic(false); setError(null);
  }

  function handleSave() {
    setError(null);
    startTrans(async () => {
      const result = await createKnowledgeEntry({ category, title, content, isPublic });
      if (result.error) { setError(result.error); return; }
      onSaved({
        id: result.id!,
        category,
        title: title.trim(),
        content: content.trim(),
        is_active: true,
        is_public: isPublic,
        sort_order: 0,
      });
      reset();
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full border border-dashed border-zinc-800 hover:border-zinc-600 text-zinc-600 hover:text-zinc-300 text-sm py-4 rounded-xl transition-all"
      >
        + Add knowledge entry
      </button>
    );
  }

  return (
    <div className="bg-[#111] border border-[#1E1E1E] rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-zinc-200">New Entry</h3>

      {/* Category */}
      <div>
        <label className="text-xs uppercase tracking-widest text-zinc-500 block mb-2">Category</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={`text-left px-3 py-2.5 rounded-lg border text-xs transition-all ${
                category === c.value
                  ? "border-white/20 bg-white/[0.06] text-white"
                  : "border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
              }`}
            >
              <p className="font-semibold mb-0.5">{c.label}</p>
              <p className="text-[10px] opacity-70 leading-snug">{c.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="text-xs uppercase tracking-widest text-zinc-500 block mb-1.5">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputCls}
          placeholder={
            category === "policy"  ? "e.g. Cancellation Policy" :
            category === "faq"     ? "e.g. How do I care for my new tattoo?" :
            category === "style"   ? "e.g. What styles do we specialize in?" :
            category === "pricing" ? "e.g. Our pricing structure" :
            "e.g. Studio hours"
          }
          autoFocus
        />
      </div>

      {/* Content */}
      <div>
        <label className="text-xs uppercase tracking-widest text-zinc-500 block mb-1.5">Content</label>
        <textarea
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className={textareaCls}
          placeholder={
            category === "policy"  ? "We require 48-hour notice for cancellations. Deposits are non-refundable for no-shows or same-day cancellations." :
            category === "faq"     ? "Write the answer as you would tell a client directly." :
            category === "style"   ? "We specialize in Japanese traditional, Neo-Traditional, and Fine Line. We do not take tribal or UV tattoo requests." :
            category === "pricing" ? "Our base rate is $200/hour. Minimum session charge is $150. Large pieces (sleeves, backs) start at $1,200." :
            "Describe this aspect of your studio."
          }
        />
      </div>

      {/* Show on booking page toggle (FAQ only recommended) */}
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <div
          onClick={() => setIsPublic((v) => !v)}
          className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${isPublic ? "bg-[#c9a84c]" : "bg-zinc-700"}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isPublic ? "translate-x-4" : ""}`} />
        </div>
        <span className="text-xs text-zinc-400">
          Show on public booking page{category === "faq" ? "" : " (recommended for FAQ only)"}
        </span>
      </label>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={isPending || !title.trim() || !content.trim()}
          className="bg-white text-black text-xs font-bold px-5 py-2.5 rounded-full hover:bg-zinc-200 transition-colors disabled:opacity-40"
        >
          {isPending ? "Saving…" : "Save entry"}
        </button>
        <button
          onClick={() => { reset(); setOpen(false); }}
          className="text-xs text-zinc-500 hover:text-zinc-300 px-4 py-2.5 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function EntryCard({
  entry,
  onUpdated,
  onDeleted,
}: {
  entry: KnowledgeEntry;
  onUpdated: (e: KnowledgeEntry) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing]       = useState(false);
  const [title, setTitle]           = useState(entry.title);
  const [content, setContent]       = useState(entry.content);
  const [isPublic, setIsPublic]     = useState(entry.is_public);
  const [confirmDel, setConfirmDel] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [isPending, startTrans]     = useTransition();

  function handleSave() {
    setError(null);
    startTrans(async () => {
      const result = await updateKnowledgeEntry({
        id: entry.id,
        title,
        content,
        isPublic,
        isActive: entry.is_active,
      });
      if (result.error) { setError(result.error); return; }
      onUpdated({ ...entry, title, content, is_public: isPublic });
      setEditing(false);
    });
  }

  function handleToggleActive() {
    startTrans(async () => {
      await toggleKnowledgeActive(entry.id, !entry.is_active);
      onUpdated({ ...entry, is_active: !entry.is_active });
    });
  }

  function handleDelete() {
    if (!confirmDel) { setConfirmDel(true); return; }
    startTrans(async () => {
      await deleteKnowledgeEntry(entry.id);
      onDeleted(entry.id);
    });
  }

  const colorCls = CATEGORY_COLOR[entry.category];

  return (
    <div className={`bg-[#111] border border-[#1E1E1E] rounded-xl overflow-hidden transition-opacity ${!entry.is_active ? "opacity-50" : ""}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
          <span className={`text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full border shrink-0 ${colorCls}`}>
            {CATEGORIES.find((c) => c.value === entry.category)?.label ?? entry.category}
          </span>
          {entry.is_public && (
            <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full border bg-green-500/10 text-green-400 border-green-500/20 shrink-0">
              Public
            </span>
          )}
          {!entry.is_active && (
            <span className="text-[9px] uppercase tracking-widest text-zinc-600 shrink-0">Inactive</span>
          )}
          <p className="font-semibold text-sm text-[#E8E8E8] truncate">{entry.title}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleToggleActive}
            disabled={isPending}
            className="text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors disabled:opacity-50"
            title={entry.is_active ? "Disable (remove from AI context)" : "Enable"}
          >
            {entry.is_active ? "Disable" : "Enable"}
          </button>
          <button
            onClick={() => { setEditing((v) => !v); setConfirmDel(false); }}
            disabled={isPending}
            className="text-[10px] text-zinc-500 hover:text-zinc-200 transition-colors disabled:opacity-50"
          >
            {editing ? "Cancel" : "Edit"}
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className={`text-[10px] transition-colors disabled:opacity-50 ${confirmDel ? "text-red-400" : "text-zinc-700 hover:text-red-400"}`}
          >
            {confirmDel ? "Sure?" : "Delete"}
          </button>
        </div>
      </div>

      {/* Content */}
      {!editing ? (
        <div className="px-5 pb-4">
          <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">{entry.content}</p>
        </div>
      ) : (
        <div className="px-5 pb-5 space-y-3 border-t border-[#1A1A1A] pt-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-zinc-500 block mb-1.5">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-zinc-500 block mb-1.5">Content</label>
            <textarea rows={4} value={content} onChange={(e) => setContent(e.target.value)} className={textareaCls} />
          </div>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setIsPublic((v) => !v)}
              className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${isPublic ? "bg-[#c9a84c]" : "bg-zinc-700"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isPublic ? "translate-x-4" : ""}`} />
            </div>
            <span className="text-xs text-zinc-400">Show on public booking page</span>
          </label>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={isPending || !title.trim() || !content.trim()}
              className="bg-white text-black text-xs font-bold px-5 py-2.5 rounded-full hover:bg-zinc-200 disabled:opacity-40 transition-colors"
            >
              {isPending ? "Saving…" : "Save changes"}
            </button>
            <button onClick={() => { setEditing(false); setTitle(entry.title); setContent(entry.content); setIsPublic(entry.is_public); }} className="text-xs text-zinc-500 hover:text-zinc-300 px-4 py-2.5 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function KnowledgeClient({
  initialEntries,
}: {
  initialEntries: KnowledgeEntry[];
}) {
  const [entries, setEntries] = useState<KnowledgeEntry[]>(initialEntries);
  const [filter, setFilter]   = useState<KnowledgeCategory | "all">("all");

  const filtered = filter === "all" ? entries : entries.filter((e) => e.category === filter);

  const counts = CATEGORIES.reduce<Record<string, number>>((acc, c) => {
    acc[c.value] = entries.filter((e) => e.category === c.value).length;
    return acc;
  }, {});
  const activeCount = entries.filter((e) => e.is_active).length;
  const publicCount = entries.filter((e) => e.is_public).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
        <div className="bg-[#111] border border-[#1E1E1E] rounded-xl px-4 py-3 text-center">
          <p className="text-2xl font-semibold text-[#E8E8E8]">{entries.length}</p>
          <p className="text-[10px] uppercase tracking-wider text-zinc-600 mt-0.5">Total</p>
        </div>
        <div className="bg-[#111] border border-[#1E1E1E] rounded-xl px-4 py-3 text-center">
          <p className="text-2xl font-semibold text-[#c9a84c]">{activeCount}</p>
          <p className="text-[10px] uppercase tracking-wider text-zinc-600 mt-0.5">In AI Context</p>
        </div>
        <div className="bg-[#111] border border-[#1E1E1E] rounded-xl px-4 py-3 text-center">
          <p className="text-2xl font-semibold text-green-400">{publicCount}</p>
          <p className="text-[10px] uppercase tracking-wider text-zinc-600 mt-0.5">Public FAQ</p>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {([{ value: "all", label: "All" }, ...CATEGORIES.map((c) => ({ value: c.value, label: c.label }))] as { value: string; label: string }[]).map((c) => (
          <button
            key={c.value}
            onClick={() => setFilter(c.value as KnowledgeCategory | "all")}
            className={`text-xs px-3.5 py-1.5 rounded-full border transition-colors ${
              filter === c.value
                ? "bg-white/10 text-white border-white/20"
                : "text-zinc-500 border-zinc-800 hover:border-zinc-600 hover:text-zinc-300"
            }`}
          >
            {c.label}
            {c.value !== "all" && counts[c.value] > 0 && (
              <span className="ml-1.5 opacity-60">{counts[c.value]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Entry list */}
      <div className="space-y-3">
        {filtered.length === 0 && entries.length > 0 && (
          <div className="bg-[#111] border border-[#1E1E1E] rounded-xl px-6 py-10 text-center">
            <p className="text-zinc-500 text-sm">No entries in this category yet.</p>
          </div>
        )}
        {filtered.map((entry) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            onUpdated={(updated) =>
              setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
            }
            onDeleted={(id) =>
              setEntries((prev) => prev.filter((e) => e.id !== id))
            }
          />
        ))}

        <AddEntryForm
          onSaved={(newEntry) => setEntries((prev) => [...prev, newEntry])}
        />
      </div>
    </div>
  );
}
