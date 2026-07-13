"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioId } from "@/lib/auth/config";
import { revalidatePath } from "next/cache";
import { getArtistBookingCountForMonth } from "@/lib/waitlist";

export type ArtistCapRow = {
  id: string;
  name: string;
  monthlyBookingCap: number;
  bookingsThisMonth: number;
};

export type WaitlistEntry = {
  id: string;
  clientName: string;
  artistName: string;
  preferredStyle: string | null;
  notes: string | null;
  notified: boolean;
  addedAt: string;
};

export async function getWaitlistData(): Promise<{ artists: ArtistCapRow[]; entries: WaitlistEntry[] }> {
  const studioId = await getStudioId();
  if (!studioId) return { artists: [], entries: [] };

  const supabase = createAdminClient();

  const { data: artistRows } = await supabase
    .from("artists")
    .select("id, name, monthly_booking_cap")
    .eq("studio_id", studioId)
    .eq("is_active", true);

  const artists = (artistRows ?? []) as { id: string; name: string; monthly_booking_cap: number }[];
  const today = new Date().toISOString().split("T")[0];

  const artistCapRows: ArtistCapRow[] = await Promise.all(
    artists.map(async (a) => ({
      id: a.id,
      name: a.name,
      monthlyBookingCap: a.monthly_booking_cap,
      bookingsThisMonth: await getArtistBookingCountForMonth(supabase, a.id, today),
    }))
  );

  const { data: waitlistRows } = await supabase
    .from("waitlist")
    .select("id, artist_id, client_id, preferred_style, notes, notified, added_at")
    .eq("studio_id", studioId)
    .order("added_at", { ascending: true });

  const entries = (waitlistRows ?? []) as {
    id: string;
    artist_id: string;
    client_id: string;
    preferred_style: string | null;
    notes: string | null;
    notified: boolean;
    added_at: string;
  }[];

  const artistNameById = new Map(artists.map((a) => [a.id, a.name]));
  const clientIds = Array.from(new Set(entries.map((e) => e.client_id)));
  const { data: clientRows } = clientIds.length
    ? await supabase.from("clients").select("id, full_name").in("id", clientIds)
    : { data: [] as { id: string; full_name: string }[] };
  const clientNameById = new Map(
    ((clientRows ?? []) as { id: string; full_name: string }[]).map((c) => [c.id, c.full_name])
  );

  const waitlistEntries: WaitlistEntry[] = entries.map((e) => ({
    id: e.id,
    clientName: clientNameById.get(e.client_id) ?? "—",
    artistName: artistNameById.get(e.artist_id) ?? "—",
    preferredStyle: e.preferred_style,
    notes: e.notes,
    notified: e.notified,
    addedAt: e.added_at,
  }));

  return { artists: artistCapRows, entries: waitlistEntries };
}

export async function updateMonthlyCap(artistId: string, cap: number): Promise<{ error?: string }> {
  const studioId = await getStudioId();
  if (!studioId) return { error: "Unauthorized" };

  if (!Number.isInteger(cap) || cap < 1) {
    return { error: "Monthly cap must be a positive whole number" };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("artists")
    .update({ monthly_booking_cap: cap } as never)
    .eq("id", artistId)
    .eq("studio_id", studioId);

  if (error) {
    console.error("[updateMonthlyCap]", error.message);
    return { error: "Failed to update — please try again" };
  }

  revalidatePath("/owner/waitlist");
  return {};
}

export async function removeFromWaitlist(id: string): Promise<{ error?: string }> {
  const studioId = await getStudioId();
  if (!studioId) return { error: "Unauthorized" };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("waitlist")
    .delete()
    .eq("id", id)
    .eq("studio_id", studioId);

  if (error) {
    console.error("[removeFromWaitlist]", error.message);
    return { error: "Failed to remove — please try again" };
  }

  revalidatePath("/owner/waitlist");
  return {};
}
