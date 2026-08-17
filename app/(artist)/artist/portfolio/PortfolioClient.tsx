"use client";

import { useRef, useState, useTransition } from "react";
import { uploadPhoto, deletePhoto, updatePhotoStyle, type Photo } from "./actions";

// Re-export so portfolio/page.tsx import path stays unchanged
export type { Photo };

// Matches lib/file-validation.ts's ALLOWED_EXTENSIONS/ALLOWED_MIME_TYPES exactly
// — the old version of this file advertised image/gif here, which the server
// action has always rejected (validateImageFile has never accepted GIF), so
// picking a GIF always failed with a confusing error after the fact.
const ACCEPTED = "image/jpeg,image/png,image/webp";
const MAX_MB = 5;

export default function PortfolioClient({
  artistId,
  initialPhotos,
}: {
  artistId: string;
  initialPhotos: Photo[];
}) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [editingStyleId, setEditingStyleId] = useState<string | null>(null);
  const [styleDraft, setStyleDraft] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingStyleRef = useRef("");

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`File must be under ${MAX_MB}MB`);
      return;
    }

    setError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("artistId", artistId);
    if (pendingStyleRef.current) formData.append("style", pendingStyleRef.current);

    const result = await uploadPhoto(formData);

    if (result.error) {
      setError(result.error);
    } else if (result.photo) {
      setPhotos((prev) => [result.photo!, ...prev]);
    }

    pendingStyleRef.current = "";
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function openFilePicker(style: string) {
    pendingStyleRef.current = style;
    fileRef.current?.click();
  }

  function handleDelete(photo: Photo) {
    if (!window.confirm("Remove this photo from your portfolio? This can't be undone.")) return;
    startTransition(async () => {
      const result = await deletePhoto({
        photoId: photo.id,
        imageUrl: photo.url,
        artistId,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      }
    });
  }

  function startEditStyle(photo: Photo) {
    setEditingStyleId(photo.id);
    setStyleDraft(photo.style ?? "");
  }

  function saveStyle(photoId: string) {
    const trimmed = styleDraft.trim() || null;
    startTransition(async () => {
      const result = await updatePhotoStyle({ photoId, artistId, style: trimmed });
      if (result.error) {
        setError(result.error);
      } else {
        setPhotos((prev) => prev.map((p) => (p.id === photoId ? { ...p, style: trimmed } : p)));
      }
      setEditingStyleId(null);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900">Photos</h2>
        <div className="flex items-center gap-3">
          {error && <span className="text-xs text-red-600">{error}</span>}
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={handleUpload}
          />
          <button
            onClick={() => openFilePicker("")}
            disabled={uploading || isPending}
            className="bg-violet-600 hover:bg-violet-700 text-white text-sm px-4 py-2 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? "Uploading…" : "+ Upload photo"}
          </button>
        </div>
      </div>

      {photos.length === 0 ? (
        <button
          onClick={() => openFilePicker("")}
          disabled={uploading}
          className="w-full bg-white rounded-2xl border border-dashed border-zinc-300 shadow-sm px-6 py-16 text-center hover:border-violet-300 transition-colors disabled:opacity-50"
        >
          <p className="text-base font-semibold text-zinc-900 mb-2">No photos yet</p>
          <p className="text-zinc-500 text-sm">Upload your first piece — it&apos;ll appear on your studio&apos;s public booking page.</p>
        </button>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden group">
              <div className="aspect-square relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={photo.style ?? "Portfolio photo"} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <button
                    onClick={() => handleDelete(photo)}
                    disabled={isPending}
                    className="text-white text-xs bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="px-3 py-2">
                {editingStyleId === photo.id ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      autoFocus
                      value={styleDraft}
                      onChange={(e) => setStyleDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveStyle(photo.id); if (e.key === "Escape") setEditingStyleId(null); }}
                      placeholder="e.g. Japanese"
                      className="flex-1 min-w-0 text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1 text-zinc-800 focus:outline-none focus:border-violet-400"
                    />
                    <button onClick={() => saveStyle(photo.id)} className="text-xs text-violet-600 font-medium shrink-0">Save</button>
                  </div>
                ) : (
                  <button
                    onClick={() => startEditStyle(photo)}
                    className="text-xs text-zinc-500 hover:text-violet-600 transition-colors truncate block w-full text-left"
                  >
                    {photo.style ?? "+ Add style tag"}
                  </button>
                )}
              </div>
            </div>
          ))}
          <button
            onClick={() => openFilePicker("")}
            disabled={uploading}
            className="aspect-square bg-white border border-dashed border-zinc-300 rounded-2xl flex items-center justify-center text-zinc-400 text-xs hover:border-violet-300 hover:text-violet-600 transition-colors disabled:opacity-50"
          >
            + Add
          </button>
        </div>
      )}

      <p className="text-xs text-zinc-400">Max {MAX_MB}MB per photo · JPEG, PNG, WebP</p>
    </div>
  );
}
