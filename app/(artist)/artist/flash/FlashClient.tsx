"use client";

import { useState, useRef, useTransition } from "react";
import { createFlashDesign, updateFlashDesign, deleteFlashDesign, type FlashRow } from "./actions";

export type FlashDesign = FlashRow;

const CATEGORIES = ["Florals", "Geometric", "Traditional", "Blackwork", "Neo-trad", "Other"];

const EMPTY_FORM = {
  title: "",
  description: "",
  price: "",
  category: "",
  isRepeatable: true,
  isAvailable: true,
};

type Mode = "idle" | "create" | "edit";

function fmtPrice(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
}

export default function FlashClient({
  artistId,
  studioId,
  initialDesigns,
}: {
  artistId: string;
  studioId: string;
  initialDesigns: FlashDesign[];
}) {
  const [designs, setDesigns]     = useState<FlashDesign[]>(initialDesigns);
  const [mode, setMode]           = useState<Mode>("idle");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm]           = useState({ ...EMPTY_FORM });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const editingDesign = editingId ? designs.find((d) => d.id === editingId) ?? null : null;
  // Once a one-off (non-repeatable) design has been booked, it's consumed —
  // re-enabling availability would let a second client book a piece that
  // can only be tattooed once. A repeatable design is meant to be reopened
  // after each booking, so this only blocks the non-repeatable case. See
  // updateFlashDesign()'s matching server-side guard (the real enforcement;
  // this is just earlier, clearer feedback).
  const availabilityLocked = !!editingDesign?.is_booked && !form.isRepeatable;

  function openCreate() {
    setForm({ ...EMPTY_FORM });
    setImageFile(null);
    setImagePreview(null);
    setError(null);
    setEditingId(null);
    setMode("create");
  }

  function openEdit(d: FlashDesign) {
    setForm({
      title:       d.title,
      description: d.description ?? "",
      price:       String(d.price / 100),
      category:    d.category ?? "",
      isRepeatable: d.is_repeatable,
      isAvailable:  d.is_available,
    });
    setImageFile(null);
    setImagePreview(null);
    setError(null);
    setEditingId(d.id);
    setMode("edit");
  }

  function cancelForm() {
    setMode("idle");
    setEditingId(null);
    setError(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5 MB");
      return;
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!imageFile) { setError("Please select an image"); return; }
    setError(null);
    setUploading(true);

    const fd = new FormData();
    fd.append("artistId",    artistId);
    fd.append("studioId",    studioId);
    fd.append("file",        imageFile);
    fd.append("title",       form.title);
    fd.append("description", form.description);
    fd.append("price",       form.price);
    fd.append("category",    form.category);
    fd.append("isRepeatable", String(form.isRepeatable));
    fd.append("isAvailable",  String(form.isAvailable));

    const result = await createFlashDesign(fd);
    setUploading(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.design) {
      setDesigns((prev) => [result.design!, ...prev]);
    }
    cancelForm();
  }

  function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setError(null);

    const priceDollars = parseFloat(form.price);
    if (isNaN(priceDollars) || priceDollars < 0) { setError("Invalid price"); return; }

    startTransition(async () => {
      const result = await updateFlashDesign({
        id:          editingId,
        artistId,
        title:       form.title,
        description: form.description,
        price:       Math.round(priceDollars * 100),
        category:    form.category,
        isRepeatable: form.isRepeatable,
        isAvailable:  form.isAvailable,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setDesigns((prev) =>
        prev.map((d) =>
          d.id === editingId
            ? {
                ...d,
                title:        form.title,
                description:  form.description || null,
                price:        Math.round(priceDollars * 100),
                category:     form.category || null,
                is_repeatable: form.isRepeatable,
                is_available:  form.isAvailable,
              }
            : d
        )
      );
      cancelForm();
    });
  }

  function handleDelete(d: FlashDesign) {
    if (deleteConfirm !== d.id) {
      setDeleteConfirm(d.id);
      return;
    }
    startTransition(async () => {
      const result = await deleteFlashDesign({ id: d.id, artistId, imageUrl: d.image_url });
      if (result.error) {
        setError(result.error);
      } else {
        setDesigns((prev) => prev.filter((x) => x.id !== d.id));
        if (editingId === d.id) cancelForm();
      }
      setDeleteConfirm(null);
    });
  }

  const inputClass =
    "w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-colors";
  const labelClass = "text-xs text-zinc-400 block mb-1.5";

  function FormPanel({ onSubmit }: { onSubmit: (e: React.FormEvent) => void }) {
    const isCreate = mode === "create";
    return (
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 space-y-4"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-zinc-900">
            {isCreate ? "New Flash Design" : "Edit Design"}
          </h3>
          <button
            type="button"
            onClick={cancelForm}
            className="text-zinc-500 hover:text-zinc-900 text-xs transition-colors"
          >
            Cancel
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* Image upload */}
        {isCreate && (
          <div>
            <label htmlFor="flash-design-image" className={labelClass}>Design Image *</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="border border-dashed border-zinc-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-violet-300 transition-colors overflow-hidden"
              style={{ height: imagePreview ? "auto" : "120px" }}
            >
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-cover rounded-xl" />
              ) : (
                <span className="text-zinc-400 text-xs">Click to upload · JPG, PNG, WebP · max 5 MB</span>
              )}
            </div>
            <input
              id="flash-design-image"
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>
        )}

        {/* Title */}
        <div>
          <label htmlFor="flash-title" className={labelClass}>Title *</label>
          <input
            id="flash-title"
            required
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="e.g. Rose with thorns"
            className={inputClass}
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="flash-description" className={labelClass}>Description</label>
          <textarea
            id="flash-description"
            rows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Optional details about this design"
            className={`${inputClass} resize-none`}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Price */}
          <div>
            <label htmlFor="flash-price" className={labelClass}>Price (USD) *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
              <input
                id="flash-price"
                required
                type="number"
                min="0"
                step="1"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="150"
                className={`${inputClass} pl-7`}
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label htmlFor="flash-category" className={labelClass}>Category</label>
            <select
              id="flash-category"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className={inputClass}
            >
              <option value="">No category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Toggles */}
        <div className="flex gap-6 pt-1">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isRepeatable}
              onChange={(e) => setForm((f) => ({ ...f, isRepeatable: e.target.checked }))}
              className="w-4 h-4 accent-violet-600"
            />
            <span className="text-sm text-zinc-700">Repeatable</span>
          </label>
          <label className={`flex items-center gap-2.5 ${availabilityLocked ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
            <input
              type="checkbox"
              checked={form.isAvailable}
              disabled={availabilityLocked}
              onChange={(e) => setForm((f) => ({ ...f, isAvailable: e.target.checked }))}
              className="w-4 h-4 accent-violet-600"
            />
            <span className="text-sm text-zinc-700">Available</span>
          </label>
        </div>
        {availabilityLocked && (
          <p className="text-[11px] text-amber-600 -mt-2">
            This one-off design has already been booked. Mark it repeatable to reopen it, or leave it unavailable.
          </p>
        )}

        <div className="pt-1">
          <button
            type="submit"
            disabled={uploading || isPending}
            className="bg-violet-600 hover:bg-violet-700 text-white text-sm px-6 py-2.5 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading || isPending
              ? isCreate ? "Uploading…" : "Saving…"
              : isCreate ? "Create Design" : "Save Changes"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">{designs.length} design{designs.length !== 1 ? "s" : ""}</p>
        {mode === "idle" && (
          <button
            onClick={openCreate}
            className="bg-violet-600 hover:bg-violet-700 text-white text-sm px-4 py-2 rounded-xl font-semibold transition-colors"
          >
            + Add Design
          </button>
        )}
      </div>

      {/* Inline create/edit form */}
      {mode === "create" && <FormPanel onSubmit={handleCreate} />}
      {mode === "edit"   && <FormPanel onSubmit={handleUpdate} />}

      {error && mode === "idle" && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      {/* Grid */}
      {designs.length === 0 && mode === "idle" ? (
        <div className="bg-white rounded-2xl border border-dashed border-zinc-300 shadow-sm px-6 py-16 text-center">
          <p className="text-zinc-900 font-semibold text-sm mb-1">No flash designs yet</p>
          <p className="text-zinc-400 text-xs">Add your first ready-made design to let clients book directly.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {designs.map((d) => {
            const isEditing = editingId === d.id && mode === "edit";
            return (
              <div
                key={d.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden group transition-colors ${
                  isEditing ? "border-violet-300" : "border-zinc-200 hover:border-violet-200"
                }`}
              >
                {/* Image */}
                <div className="aspect-square overflow-hidden bg-zinc-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={d.image_url}
                    alt={d.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="text-sm font-medium text-zinc-900 truncate mb-0.5">{d.title}</p>
                  <p className="text-violet-600 text-xs font-semibold mb-1.5">{fmtPrice(d.price)}</p>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {d.category && (
                      <span className="text-[9px] uppercase tracking-wide bg-zinc-50 text-zinc-500 px-1.5 py-0.5 rounded-full border border-zinc-200">
                        {d.category}
                      </span>
                    )}
                    {!d.is_repeatable && (
                      <span className="text-[9px] uppercase tracking-wide bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded-full border border-violet-200">
                        One-time
                      </span>
                    )}
                    {!d.is_available && (
                      <span className="text-[9px] uppercase tracking-wide bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded-full border border-zinc-200">
                        Hidden
                      </span>
                    )}
                    {d.is_booked && (
                      <span className="text-[9px] uppercase tracking-wide bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full border border-emerald-200">
                        Booked
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(d)}
                      disabled={isPending}
                      className="flex-1 text-xs text-zinc-600 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-100 px-2 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(d)}
                      disabled={isPending}
                      className={`flex-1 text-xs px-2 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                        deleteConfirm === d.id
                          ? "bg-red-600 text-white hover:bg-red-700"
                          : "text-zinc-500 hover:text-red-600 bg-zinc-50 hover:bg-zinc-100"
                      }`}
                    >
                      {deleteConfirm === d.id ? "Confirm?" : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-zinc-400">Images are stored in your portfolio bucket · JPG, PNG, WebP · max 5 MB</p>
    </div>
  );
}
