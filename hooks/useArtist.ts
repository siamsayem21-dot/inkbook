"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Artist, ArtistWithStats } from "@/types";

export function useArtist(artistId: string) {
  const [artist, setArtist] = useState<ArtistWithStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!artistId) return;
    const supabase = createClient();

    supabase
      .from("artists")
      .select("*")
      .eq("id", artistId)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setArtist(data as ArtistWithStats);
        setLoading(false);
      });
  }, [artistId]);

  const updateStyles = async (styles: string[]) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("artists")
      .update({ styles })
      .eq("id", artistId);
    if (!error && artist) setArtist({ ...artist, styles });
  };

  return { artist, loading, error, updateStyles };
}

export function useStudioArtists(studioId: string) {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studioId) return;
    const supabase = createClient();

    supabase
      .from("artists")
      .select("*")
      .eq("studio_id", studioId)
      .then(({ data }) => {
        setArtists((data ?? []) as Artist[]);
        setLoading(false);
      });
  }, [studioId]);

  return { artists, loading };
}
