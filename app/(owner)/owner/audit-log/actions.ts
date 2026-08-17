"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioId } from "@/lib/auth/config";

export type AuditLogEntry = {
  id: string;
  actorType: "owner" | "artist" | "client" | "system";
  actorLabel: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

const PAGE_SIZE = 50;

export async function getAuditLogEntries(opts: {
  action?: string;
  page?: number;
} = {}): Promise<{ entries: AuditLogEntry[]; total: number; actions: string[] }> {
  const studioId = await getStudioId();
  if (!studioId) return { entries: [], total: 0, actions: [] };

  const supabase = createAdminClient();
  const page = Math.max(1, opts.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("audit_log")
    .select("id, actor_type, actor_label, action, entity_type, entity_id, metadata, created_at", { count: "exact" })
    .eq("studio_id", studioId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (opts.action) {
    query = query.eq("action", opts.action);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("[getAuditLogEntries]", error.message);
    return { entries: [], total: 0, actions: [] };
  }

  const rows = (data ?? []) as {
    id: string;
    actor_type: "owner" | "artist" | "client" | "system";
    actor_label: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
  }[];

  // Distinct action list for the filter dropdown — scoped to this studio,
  // not the whole table, so a studio never sees another studio's action set.
  const { data: distinctRaw } = await supabase
    .from("audit_log")
    .select("action")
    .eq("studio_id", studioId);
  const actions = Array.from(new Set(((distinctRaw ?? []) as { action: string }[]).map((r) => r.action))).sort();

  return {
    entries: rows.map((r) => ({
      id: r.id,
      actorType: r.actor_type,
      actorLabel: r.actor_label,
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      metadata: r.metadata ?? {},
      createdAt: r.created_at,
    })),
    total: count ?? 0,
    actions,
  };
}
