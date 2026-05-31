"use server";

import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function acceptInvite(data: {
  token: string;
  name: string;
  password: string;
}): Promise<{ error?: string }> {
  if (data.password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  const supabase = adminClient();

  // Re-validate token (handles race conditions / double-submit)
  const { data: invite } = await supabase
    .from("artist_invites")
    .select("id, studio_id, invited_email, accepted_at, expires_at")
    .eq("token", data.token)
    .maybeSingle();

  if (!invite) return { error: "Invalid invite link" };
  if (invite.accepted_at) return { error: "This invite has already been used" };
  if (new Date(invite.expires_at) < new Date()) return { error: "This invite link has expired" };

  const inv = invite as {
    id: string;
    studio_id: string;
    invited_email: string;
    accepted_at: string | null;
    expires_at: string;
  };

  // Create the Supabase auth user
  const { data: authData, error: createError } = await supabase.auth.admin.createUser({
    email: inv.invited_email,
    password: data.password,
    email_confirm: true, // skip email verification — invite already verified identity
    user_metadata: { full_name: data.name },
  });

  if (createError) {
    console.error("[acceptInvite] createUser failed:", createError.message);
    if (createError.message?.toLowerCase().includes("already")) {
      return { error: "An account with this email already exists. Please sign in instead." };
    }
    return { error: createError.message ?? "Failed to create account — please try again" };
  }

  const userId = authData.user.id;

  // Create the artist row
  const { data: newArtist, error: artistError } = await supabase
    .from("artists")
    .insert({
      studio_id: inv.studio_id,
      user_id: userId,
      name: data.name,
      email: inv.invited_email,
      is_active: true,
    })
    .select("id")
    .single();

  if (artistError) {
    console.error("[acceptInvite] artist insert failed:", artistError.message);
    // Rollback: delete the auth user we just created
    await supabase.auth.admin.deleteUser(userId);
    return { error: "Failed to create artist profile — please try again" };
  }

  const artist = newArtist as { id: string };

  // Mark invite as accepted
  await supabase
    .from("artist_invites")
    .update({
      accepted_at: new Date().toISOString(),
      artist_id: artist.id,
    })
    .eq("token", data.token);

  return {};
}
