"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.inkbook.tech";

export async function inviteArtist(data: {
  name: string;
  email: string;
  studioId: string;
}): Promise<{ error?: string }> {
  const supabase = adminClient();

  // Check for existing artist with this email in the same studio
  const { data: existing } = await supabase
    .from("artists")
    .select("id, is_active")
    .eq("email", data.email)
    .eq("studio_id", data.studioId)
    .maybeSingle();

  if (existing) {
    return existing.is_active
      ? { error: "Email already has an active account" }
      : { error: "Email already invited to this studio" };
  }

  // Insert artist row first so we have the ID for the redirectTo URL
  const { data: inserted, error: insertError } = await supabase
    .from("artists")
    .insert({ name: data.name, email: data.email, studio_id: data.studioId, is_active: false })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("[inviteArtist] DB insert failed:", insertError?.message, insertError?.details);
    return { error: insertError?.message ?? "Failed to create artist record — try again" };
  }

  // Embed artist_id in redirectTo so the callback can match the exact row
  const redirectTo = `${BASE_URL}/auth/callback?next=/artist/dashboard&artist_id=${inserted.id}`;

  const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(data.email, {
    redirectTo,
    data: { full_name: data.name },
  });

  if (inviteError) {
    console.error("[inviteArtist] inviteUserByEmail failed:", inviteError.message);
    // Rollback the DB insert
    await supabase.from("artists").delete().eq("id", inserted.id);

    if (inviteError.message?.toLowerCase().includes("already been registered")) {
      return { error: "This email already has an InkBook account" };
    }
    return { error: inviteError.message ?? "Failed to send invite email — try again" };
  }

  revalidatePath("/owner/artists");
  return {};
}

export async function resendInvite(data: {
  artistId: string;
  email: string;
  createdAt: string;
}): Promise<{ error?: string }> {
  const hoursSince = (Date.now() - new Date(data.createdAt).getTime()) / 3_600_000;
  if (hoursSince < 24) {
    return { error: "Invite sent recently, try again tomorrow" };
  }

  const supabase = adminClient();
  const redirectTo = `${BASE_URL}/auth/callback?next=/artist/dashboard&artist_id=${data.artistId}`;

  const { error } = await supabase.auth.admin.inviteUserByEmail(data.email, { redirectTo });
  if (error) {
    console.error("[resendInvite] inviteUserByEmail failed:", error.message);
    return { error: error.message ?? "Failed to send invite email — try again" };
  }

  revalidatePath("/owner/artists");
  return {};
}

export async function removeArtist(artistId: string): Promise<{ error?: string }> {
  const supabase = adminClient();
  const { error } = await supabase
    .from("artists")
    .update({ is_active: false, user_id: null })
    .eq("id", artistId);

  if (error) return { error: "Something went wrong — try again" };

  revalidatePath("/owner/artists");
  return {};
}

export async function getUpcomingBookingsCount(artistId: string): Promise<number> {
  const supabase = adminClient();
  const today = new Date().toISOString().split("T")[0];
  const { count } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("artist_id", artistId)
    .gt("date", today)
    .neq("status", "cancelled")
    .neq("status", "no_show");
  return count ?? 0;
}
