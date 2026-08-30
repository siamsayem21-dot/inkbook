"use server";

import { createClient } from "@supabase/supabase-js";
import { findAuthUserByEmail } from "@/lib/auth/find-user-by-email";

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
  // Optional as of 2026-08-30: the invite-accept page now checks upfront
  // (page.tsx, via the same findAuthUserByEmail) whether this email
  // already has an account and, if so, never shows password fields at
  // all — omitted here means "link my existing account, don't create a
  // new one." See acceptInviteInner's early branch below.
  password?: string;
}): Promise<{ error?: string }> {
  try {
    return await acceptInviteInner(data);
  } catch (err) {
    // A previously-unhandled exception anywhere in this flow (any of the
    // several Supabase admin calls below, or the fetch above) would
    // propagate as a raw server-action rejection instead of the normal
    // { error } shape the client already knows how to display — this is
    // the server-side half of the fix for the "stuck on Setting up your
    // account..." bug (see AcceptForm.tsx's client-side try/catch for the
    // other half).
    console.error("[acceptInvite] unexpected error:", err);
    return { error: "Something went wrong setting up your account. Please try again." };
  }
}

async function acceptInviteInner(data: {
  token: string;
  name: string;
  password?: string;
}): Promise<{ error?: string }> {
  if (data.password !== undefined && data.password.length < 8) {
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

  let userId: string;
  let createdNewUser = false;

  if (data.password === undefined) {
    // Existing-account path: the client already knows (page.tsx checked
    // before rendering) that this email has a real account, so it never
    // collected a password — skip createUser entirely rather than
    // deliberately calling it just to catch the email_exists error, and
    // NEVER touch this account's real password. If the account no longer
    // exists (rare TOCTOU — deleted between page load and submit), fail
    // clearly instead of silently creating an unwanted new one.
    const existing = await findAuthUserByEmail(inv.invited_email);
    if (!existing) {
      console.error("[acceptInvite] expected existing account not found:", inv.invited_email);
      return { error: "We couldn't find your existing account — please refresh this page and try again." };
    }

    const { data: existingArtist } = await supabase
      .from("artists")
      .select("id")
      .eq("user_id", existing.id)
      .eq("studio_id", inv.studio_id)
      .maybeSingle();

    if (existingArtist) {
      await supabase
        .from("artist_invites")
        .update({ accepted_at: new Date().toISOString(), artist_id: (existingArtist as { id: string }).id })
        .eq("token", data.token);
      return {};
    }

    userId = existing.id;
    createdNewUser = false;
  } else {
    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email: inv.invited_email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.name },
    });

    if (createError) {
      // GoTrue returns error_code "email_exists" when the address is already
      // registered — a race the page-level check above can't fully rule out
      // (e.g. the account was created in the moments between page load and
      // submit). Instead of blocking the invite, link the existing account
      // to this studio as an artist, same as the branch above.
      const isEmailExists =
        (createError as unknown as { code?: string }).code === "email_exists" ||
        createError.message?.toLowerCase().includes("already been registered");

      if (!isEmailExists) {
        console.error("[acceptInvite] createUser failed:", createError.message);
        return { error: createError.message ?? "Failed to create account — please try again" };
      }

      const existing = await findAuthUserByEmail(inv.invited_email);
      if (!existing) {
        console.error("[acceptInvite] email_exists but user not found:", inv.invited_email);
        return { error: "Account conflict — please contact your studio owner." };
      }

      const { data: existingArtist } = await supabase
        .from("artists")
        .select("id")
        .eq("user_id", existing.id)
        .eq("studio_id", inv.studio_id)
        .maybeSingle();

      if (existingArtist) {
        await supabase
          .from("artist_invites")
          .update({ accepted_at: new Date().toISOString(), artist_id: (existingArtist as { id: string }).id })
          .eq("token", data.token);
        return {};
      }

      userId = existing.id;
      createdNewUser = false;
    } else {
      userId = authData.user.id;
      createdNewUser = true;
    }
  }

  // Revive a previously-removed artist's row instead of inserting a
  // duplicate. removeArtist() (app/(owner)/owner/artists/actions.ts) only
  // nulls user_id — it never deletes the row — so a prior removal at this
  // exact studio, for this exact email, leaves a row with user_id IS NULL.
  // Reusing it (rather than inserting a fresh one) keeps their portfolio/
  // flash/booking/consultation history correctly attached to the same
  // artists.id. Scoped to studio_id + email together so this can never
  // match — or reactivate — a different studio's artist.
  const { data: removedArtistRaw } = await supabase
    .from("artists")
    .select("id")
    .eq("studio_id", inv.studio_id)
    .eq("email", inv.invited_email)
    .is("user_id", null)
    .maybeSingle();

  const removedArtist = removedArtistRaw as { id: string } | null;

  let artist: { id: string };

  if (removedArtist) {
    const { data: revivedArtist, error: reviveError } = await supabase
      .from("artists")
      .update({ user_id: userId, name: data.name, is_active: true })
      .eq("id", removedArtist.id)
      .select("id")
      .single();

    if (reviveError || !revivedArtist) {
      console.error("[acceptInvite] artist revive failed:", reviveError?.message);
      if (createdNewUser) {
        await supabase.auth.admin.deleteUser(userId);
      }
      return { error: "Failed to reactivate artist profile — please try again" };
    }

    artist = revivedArtist as { id: string };
  } else {
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
      if (createdNewUser) {
        await supabase.auth.admin.deleteUser(userId);
      }
      return { error: "Failed to create artist profile — please try again" };
    }

    artist = newArtist as { id: string };
  }

  // Mark invite as accepted
  const { error: updateError } = await supabase
    .from("artist_invites")
    .update({
      accepted_at: new Date().toISOString(),
      artist_id: artist.id,
    })
    .eq("token", data.token);

  if (updateError) {
    console.error("[acceptInvite] accepted_at update failed:", updateError.message);
  }

  return {};
}
