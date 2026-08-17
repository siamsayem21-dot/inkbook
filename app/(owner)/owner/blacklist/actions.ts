"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioId, getCurrentUser } from "@/lib/auth/config";
import { revalidatePath } from "next/cache";
import { logAuditEvent } from "@/lib/audit-log";

export type BlacklistEntry = {
  id: string;
  client_email: string | null;
  client_phone: string | null;
  reason: string | null;
  created_at: string;
  blocked_by_email: string | null;
};

export async function addToBlacklist(data: {
  clientEmail: string;
  clientPhone: string;
  reason: string;
}): Promise<{ error?: string }> {
  const [studioId, user] = await Promise.all([getStudioId(), getCurrentUser()]);
  if (!studioId || !user) return { error: "Unauthorized" };

  const email = data.clientEmail.trim();
  const phone = data.clientPhone.trim();

  if (!email && !phone) {
    return { error: "Provide at least an email or phone number" };
  }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRe.test(email)) return { error: "Invalid email address" };

  const supabase = createAdminClient();

  // Prevent duplicate entries for the same identifier
  if (email) {
    const { data: existing } = await supabase
      .from("blacklist")
      .select("id")
      .eq("studio_id", studioId)
      .eq("client_email", email)
      .maybeSingle();
    if (existing) return { error: "This email is already blocked" };
  }
  if (phone) {
    const { data: existing } = await supabase
      .from("blacklist")
      .select("id")
      .eq("studio_id", studioId)
      .eq("client_phone", phone)
      .maybeSingle();
    if (existing) return { error: "This phone number is already blocked" };
  }

  const { data: inserted, error } = await supabase
    .from("blacklist")
    .insert({
      studio_id:    studioId,
      blocked_by:   user.id,
      client_email: email || null,
      client_phone: phone || null,
      reason:       data.reason.trim() || null,
    } as never)
    .select("id")
    .single();

  if (error) {
    console.error("[addToBlacklist]", error.message);
    return { error: "Failed to block client — please try again" };
  }

  void logAuditEvent({
    studioId,
    actorType: "owner",
    actorId: user.id,
    actorLabel: user.email ?? "Owner",
    action: "blacklist.added",
    entityType: "blacklist",
    entityId: (inserted as { id: string } | null)?.id ?? null,
    metadata: { client_email: email || null, client_phone: phone || null, reason: data.reason.trim() || null },
  });

  revalidatePath("/owner/blacklist");
  return {};
}

export async function removeFromBlacklist(id: string): Promise<{ error?: string }> {
  const [studioId, user] = await Promise.all([getStudioId(), getCurrentUser()]);
  if (!studioId || !user) return { error: "Unauthorized" };

  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("blacklist")
    .select("client_email, client_phone")
    .eq("id", id)
    .eq("studio_id", studioId)
    .maybeSingle();

  const { error } = await supabase
    .from("blacklist")
    .delete()
    .eq("id", id)
    .eq("studio_id" as never, studioId);

  if (error) {
    console.error("[removeFromBlacklist]", error.message);
    return { error: "Failed to remove — please try again" };
  }

  void logAuditEvent({
    studioId,
    actorType: "owner",
    actorId: user.id,
    actorLabel: user.email ?? "Owner",
    action: "blacklist.removed",
    entityType: "blacklist",
    entityId: id,
    metadata: existing ? { client_email: (existing as { client_email: string | null }).client_email, client_phone: (existing as { client_phone: string | null }).client_phone } : {},
  });

  revalidatePath("/owner/blacklist");
  return {};
}

export async function getBlacklistEntries(): Promise<BlacklistEntry[]> {
  const studioId = await getStudioId();
  if (!studioId) return [];

  const supabase = createAdminClient();

  const { data } = await supabase
    .from("blacklist")
    .select("id, client_email, client_phone, reason, created_at, blocked_by")
    .eq("studio_id", studioId)
    .order("created_at", { ascending: false });

  if (!data) return [];

  // Resolve blocked_by user email
  const rows = data as {
    id: string;
    client_email: string | null;
    client_phone: string | null;
    reason: string | null;
    created_at: string;
    blocked_by: string;
  }[];

  const userIds = Array.from(new Set(rows.map((r) => r.blocked_by)));
  const emailMap: Record<string, string> = {};

  await Promise.all(
    userIds.map(async (uid) => {
      const { data: u } = await supabase.auth.admin.getUserById(uid);
      if (u?.user?.email) emailMap[uid] = u.user.email;
    })
  );

  return rows.map((r) => ({
    id:             r.id,
    client_email:   r.client_email,
    client_phone:   r.client_phone,
    reason:         r.reason,
    created_at:     r.created_at,
    blocked_by_email: emailMap[r.blocked_by] ?? null,
  }));
}
