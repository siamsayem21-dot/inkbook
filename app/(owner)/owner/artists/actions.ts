"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioId } from "@/lib/auth/config";
import { revalidatePath } from "next/cache";
import { sendArtistInviteEmail } from "@/lib/email";
import { isAtArtistLimit } from "@/lib/plan-limits";

export async function inviteArtist(data: {
  name: string;
  email: string;
  studioId: string;
}): Promise<{ error?: string }> {
  const callerStudioId = await getStudioId();
  if (!callerStudioId) return { error: "Unauthorized" };
  if (callerStudioId !== data.studioId) return { error: "Unauthorized" };

  const supabase = createAdminClient();

  // Block if an active artist already has this email in this studio
  const { data: activeArtistRaw } = await supabase
    .from("artists")
    .select("id")
    .eq("email", data.email)
    .eq("studio_id", data.studioId)
    .maybeSingle();

  const activeArtist = activeArtistRaw as { id: string; is_active: boolean } | null;
  if (activeArtist) {
    return { error: "Email already has an active account in this studio" };
  }

  // Block if a pending (non-expired, non-accepted) invite already exists
  const { data: pendingInviteRaw } = await supabase
    .from("artist_invites")
    .select("id")
    .eq("invited_email", data.email)
    .eq("studio_id", data.studioId)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (pendingInviteRaw) {
    return { error: "Email already invited to this studio" };
  }

  // Look up studio name, owner_id, and plan
  const { data: studioRaw } = await supabase
    .from("studios")
    .select("name, owner_id, plan")
    .eq("id", data.studioId)
    .single();

  const studio = studioRaw as { name: string; owner_id: string; plan: string } | null;
  if (!studio) return { error: "Studio not found" };

  const { atLimit, limit } = await isAtArtistLimit(supabase, data.studioId, studio.plan);
  if (atLimit) {
    return {
      error: `Your current plan allows up to ${limit} artist${limit === 1 ? "" : "s"}. Upgrade your plan to invite more.`,
    };
  }

  // Insert invite — Postgres generates the token UUID automatically
  const { data: inviteRaw, error: insertError } = await supabase
    .from("artist_invites")
    .insert({
      studio_id: data.studioId,
      invited_name: data.name,
      invited_email: data.email,
      invited_by: studio.owner_id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    } as never)
    .select("token")
    .single();

  if (insertError || !inviteRaw) {
    console.error("[inviteArtist] DB insert failed:", insertError?.message);
    return { error: "Failed to create invite — please try again" };
  }

  const invite = inviteRaw as { token: string };

  try {
    await sendArtistInviteEmail({
      to: data.email,
      inviteeName: data.name,
      studioName: studio.name,
      token: invite.token,
    });
  } catch (err) {
    console.error("[inviteArtist] email send failed:", err);
    // Don't block — invite is in DB, link can still be used
  }

  revalidatePath("/owner/artists");
  return {};
}

export async function resendInvite(data: {
  inviteId: string;
  email: string;
}): Promise<{ error?: string }> {
  const callerStudioId = await getStudioId();
  if (!callerStudioId) return { error: "Unauthorized" };

  const supabase = createAdminClient();

  const { data: inviteRaw, error } = await supabase
    .from("artist_invites")
    .update({
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    } as never)
    .eq("id", data.inviteId)
    .eq("studio_id", callerStudioId)
    .is("accepted_at", null)
    .select("token, invited_name, studio_id")
    .single();

  if (error || !inviteRaw) {
    console.error("[resendInvite] update failed:", error?.message);
    return { error: "Invite not found or already accepted" };
  }

  const inv = inviteRaw as { token: string; invited_name: string; studio_id: string };

  const { data: studioRaw } = await supabase
    .from("studios")
    .select("name")
    .eq("id", inv.studio_id)
    .single();

  const studio = studioRaw as { name: string } | null;

  try {
    await sendArtistInviteEmail({
      to: data.email,
      inviteeName: inv.invited_name,
      studioName: studio?.name ?? "your studio",
      token: inv.token,
    });
  } catch (err) {
    console.error("[resendInvite] email send failed:", err);
  }

  revalidatePath("/owner/artists");
  return {};
}

export async function cancelInvite(inviteId: string): Promise<{ error?: string }> {
  const callerStudioId = await getStudioId();
  if (!callerStudioId) return { error: "Unauthorized" };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("artist_invites")
    .delete()
    .eq("id", inviteId)
    .eq("studio_id", callerStudioId)
    .is("accepted_at", null);

  if (error) {
    console.error("[cancelInvite] delete failed:", error.message);
    return { error: "Something went wrong — please try again" };
  }

  revalidatePath("/owner/artists");
  return {};
}

export async function removeArtist(artistId: string): Promise<{ error?: string }> {
  const callerStudioId = await getStudioId();
  if (!callerStudioId) return { error: "Unauthorized" };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("artists")
    .update({ user_id: null } as never)
    .eq("id", artistId)
    .eq("studio_id", callerStudioId);

  if (error) return { error: "Something went wrong — try again" };

  revalidatePath("/owner/artists");
  return {};
}

export async function getUpcomingBookingsCount(artistId: string): Promise<number> {
  const supabase = createAdminClient();
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
