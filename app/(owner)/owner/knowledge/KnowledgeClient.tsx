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
  policy:  "bg-red-50 text-red-700 border-red-200",
  faq:     "bg-sky-50 text-sky-700 border-sky-200",
  style:   "bg-violet-50 text-violet-700 border-violet-200",
  pricing: "bg-amber-50 text-amber-700 border-amber-200",
  general: "bg-zinc-100 text-zinc-500 border-zinc-200",
};

const inputCls =
  "w-full bg-zinc-50 border border-zinc-200 text-zinc-800 text-sm rounded-xl px-3.5 py-2.5 " +
  "placeholder-zinc-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-colors";
const textareaCls = `${inputCls} resize-none`;

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
        className="w-full border border-dashed border-zinc-300 hover:border-violet-300 text-zinc-500 hover:text-violet-700 text-sm py-4 rounded-2xl transition-all"
      >
        + Add knowledge entry
      </button>
    );
  }

  return (
    <div className="bg-white border border-zinc-200 shadow-sm rounded-2xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-zinc-900">New Entry</h3>

      {/* Category */}
      <div>
        <label className="text-xs text-zinc-500 block mb-2">Category</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={`text-left px-3 py-2.5 rounded-xl border text-xs transition-all ${
                category === c.value
                  ? "border-violet-300 bg-violet-50 text-violet-900"
                  : "border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-700"
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
        <label htmlFor="knowledge-title-new" className="text-xs text-zinc-500 block mb-1.5">Title</label>
        <input
          id="knowledge-title-new"
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
        <label htmlFor="knowledge-content-new" className="text-xs text-zinc-500 block mb-1.5">Content</label>
        <textarea
          id="knowledge-content-new"
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
          className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${isPublic ? "bg-violet-600" : "bg-zinc-300"}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isPublic ? "translate-x-4" : ""}`} />
        </div>
        <span className="text-xs text-zinc-500">
          Show on public booking page{category === "faq" ? "" : " (recommended for FAQ only)"}
        </span>
      </label>

      {error && <p className="text-red-600 text-xs">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={isPending || !title.trim() || !content.trim()}
          className="bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-sm px-5 py-2.5 rounded-xl font-semibold transition-colors"
        >
          {isPending ? "Saving…" : "Save entry"}
        </button>
        <button
          onClick={() => { reset(); setOpen(false); }}
          className="text-sm text-zinc-500 hover:text-zinc-700 px-4 py-2.5 transition-colors"
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
    <div className={`bg-white border border-zinc-200 shadow-sm rounded-2xl overflow-hidden transition-opacity ${!entry.is_active ? "opacity-50" : ""}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0 ${colorCls}`}>
            {CATEGORIES.find((c) => c.value === entry.category)?.label ?? entry.category}
          </span>
          {entry.is_public && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium shrink-0">
              Public
            </span>
          )}
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
              entry.is_active ? "bg-zinc-100 text-zinc-500" : "bg-amber-50 text-amber-700"
            }`}
          >
            {entry.is_active ? "Active" : "Disabled"}
          </span>
          <p className="font-semibold text-sm text-zinc-900 truncate">{entry.title}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleToggleActive}
            disabled={isPending}
            className="text-xs font-medium text-zinc-400 hover:text-zinc-700 transition-colors disabled:opacity-50"
            title={entry.is_active ? "Disable (remove from AI context)" : "Enable (restore to AI context)"}
          >
            {entry.is_active ? "Disable" : "Enable"}
          </button>
          <button
            onClick={() => { setEditing((v) => !v); setConfirmDel(false); }}
            disabled={isPending}
            className="text-xs font-medium text-violet-600 hover:text-violet-700 transition-colors disabled:opacity-50"
          >
            {editing ? "Cancel" : "Edit"}
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className={`text-xs font-medium transition-colors disabled:opacity-50 ${confirmDel ? "text-red-600" : "text-zinc-400 hover:text-red-600"}`}
          >
            {confirmDel ? "Sure?" : "Delete"}
          </button>
        </div>
      </div>

      {/* Content */}
      {!editing ? (
        <div className="px-5 pb-4">
          <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap">{entry.content}</p>
        </div>
      ) : (
        <div className="px-5 pb-5 space-y-3 border-t border-zinc-100 pt-4">
          <div>
            <label htmlFor={`knowledge-title-${entry.id}`} className="text-xs text-zinc-500 block mb-1.5">Title</label>
            <input id={`knowledge-title-${entry.id}`} type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label htmlFor={`knowledge-content-${entry.id}`} className="text-xs text-zinc-500 block mb-1.5">Content</label>
            <textarea id={`knowledge-content-${entry.id}`} rows={4} value={content} onChange={(e) => setContent(e.target.value)} className={textareaCls} />
          </div>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setIsPublic((v) => !v)}
              className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${isPublic ? "bg-violet-600" : "bg-zinc-300"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isPublic ? "translate-x-4" : ""}`} />
            </div>
            <span className="text-xs text-zinc-500">Show on public booking page</span>
          </label>
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={isPending || !title.trim() || !content.trim()}
              className="bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-sm px-5 py-2.5 rounded-xl font-semibold transition-colors"
            >
              {isPending ? "Saving…" : "Save changes"}
            </button>
            <button onClick={() => { setEditing(false); setTitle(entry.title); setContent(entry.content); setIsPublic(entry.is_public); }} className="text-sm text-zinc-500 hover:text-zinc-700 px-4 py-2.5 transition-colors">
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
        <div className="bg-white border border-zinc-200 shadow-sm rounded-2xl px-4 py-3 text-center">
          <p className="text-2xl font-semibold text-zinc-900">{entries.length}</p>
          <p className="text-[10px] uppercase tracking-wider text-zinc-400 mt-0.5">Total</p>
        </div>
        <div className="bg-white border border-zinc-200 shadow-sm rounded-2xl px-4 py-3 text-center">
          <p className="text-2xl font-semibold text-violet-600">{activeCount}</p>
          <p className="text-[10px] uppercase tracking-wider text-zinc-400 mt-0.5">In AI Context</p>
        </div>
        <div className="bg-white border border-zinc-200 shadow-sm rounded-2xl px-4 py-3 text-center">
          <p className="text-2xl font-semibold text-emerald-600">{publicCount}</p>
          <p className="text-[10px] uppercase tracking-wider text-zinc-400 mt-0.5">Public FAQ</p>
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
                ? "bg-violet-50 text-violet-700 border-violet-300"
                : "text-zinc-500 border-zinc-200 bg-white hover:border-zinc-300 hover:text-zinc-700"
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
          <div className="bg-white border border-zinc-200 shadow-sm rounded-2xl px-6 py-10 text-center">
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
