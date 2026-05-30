"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

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

  // Pre-generate the artist row ID so we can embed it in the invite redirectTo URL
  // before the row exists in the DB.
  const artistId = randomUUID();
  const redirectTo = `${BASE_URL}/auth/callback?next=/artist/dashboard&artist_id=${artistId}`;

  // 1. Create the Supabase auth user first — this gives us the real user.id
  //    which satisfies the artists_user_id_fkey foreign key constraint.
  const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
    data.email,
    { redirectTo, data: { full_name: data.name } }
  );

  if (inviteError) {
    console.error("[inviteArtist] inviteUserByEmail failed:", inviteError.message);
    if (inviteError.message?.toLowerCase().includes("already been registered")) {
      return { error: "This email already has an InkBook account" };
    }
    return { error: inviteError.message ?? "Failed to send invite email — try again" };
  }

  // 2. Insert artist row using the pre-generated ID and the real auth user.id
  const { error: insertError } = await supabase
    .from("artists")
    .insert({
      id: artistId,
      user_id: inviteData.user.id,
      name: data.name,
      email: data.email,
      studio_id: data.studioId,
      is_active: false,
    });

  if (insertError) {
    console.error("[inviteArtist] DB insert failed:", insertError.message, insertError.details);
    // Rollback: delete the auth user we just created
    await supabase.auth.admin.deleteUser(inviteData.user.id);
    return { error: insertError.message ?? "Failed to create artist record — try again" };
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
