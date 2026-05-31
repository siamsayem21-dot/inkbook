"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { deletePhoto } from "./actions";

export type Photo = {
  id: string;
  storage_path: string;
  url: string;
  style: string | null;
};

const ACCEPTED = "image/jpeg,image/png,image/webp,image/gif";
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
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`File must be under ${MAX_MB}MB`);
      return;
    }

    setError(null);
    setUploading(true);

    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "jpg";
    const storagePath = `${artistId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("portfolio")
      .upload(storagePath, file, { upsert: false });

    if (uploadError) {
      setError("Upload failed — " + uploadError.message);
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    const { data: urlData } = supabase.storage.from("portfolio").getPublicUrl(storagePath);
    const publicUrl = urlData.publicUrl;

    // Insert metadata row
    const { data: row, error: dbError } = await supabase
      .from("portfolio_photos" as never)
      .insert({ artist_id: artistId, storage_path: storagePath } as never)
      .select("id, storage_path, style")
      .single();

    if (dbError || !row) {
      setError("Saved to storage but DB insert failed — refresh to see photo.");
    } else {
      const newPhoto: Photo = {
        id: (row as { id: string }).id,
        storage_path: (row as { storage_path: string }).storage_path,
        url: publicUrl,
        style: (row as { style: string | null }).style,
      };
      setPhotos((prev) => [newPhoto, ...prev]);
    }

    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleDelete(photo: Photo) {
    startTransition(async () => {
      const result = await deletePhoto({
        photoId: photo.id,
        storagePath: photo.storage_path,
        artistId,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div />
        <div className="flex items-center gap-3">
          {error && <span className="text-xs text-red-400">{error}</span>}
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={handleUpload}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading || isPending}
            className="bg-white text-black text-sm px-4 py-2 rounded-full font-semibold hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? "Uploading…" : "+ Upload photo"}
          </button>
        </div>
      </div>

      {photos.length === 0 ? (
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <button
              key={i}
              onClick={() => fileRef.current?.click()}
              className="aspect-square bg-zinc-800 border border-dashed border-zinc-700 rounded-xl flex items-center justify-center text-zinc-600 text-xs hover:border-zinc-500 transition-colors"
            >
              + Add
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="aspect-square bg-zinc-800 rounded-xl overflow-hidden relative group">
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
          ))}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="aspect-square bg-zinc-800 border border-dashed border-zinc-700 rounded-xl flex items-center justify-center text-zinc-600 text-xs hover:border-zinc-500 transition-colors disabled:opacity-50"
          >
            + Add
          </button>
        </div>
      )}

      <p className="text-xs text-zinc-600">Max {MAX_MB}MB per photo · JPEG, PNG, WebP, GIF</p>
    </div>
  );
}
