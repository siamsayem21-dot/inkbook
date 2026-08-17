import { createAdminClient } from "@/lib/supabase/admin";

export type AuditActorType = "owner" | "artist" | "client" | "system";

export type AuditEvent = {
  studioId: string;
  actorType: AuditActorType;
  actorId?: string | null;
  actorLabel: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

// Fire-and-forget by design, same pattern as trySendSms/lib/twilio/client.ts —
// a failed audit write must never block or fail the caller's actual mutation.
// Errors are logged, not thrown.
export async function logAuditEvent(event: AuditEvent): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("audit_log").insert({
      studio_id: event.studioId,
      actor_type: event.actorType,
      actor_id: event.actorId ?? null,
      actor_label: event.actorLabel,
      action: event.action,
      entity_type: event.entityType,
      entity_id: event.entityId ?? null,
      metadata: event.metadata ?? {},
    } as never);

    if (error) {
      console.error("[logAuditEvent]", event.action, error.message);
    }
  } catch (err) {
    console.error("[logAuditEvent] threw", event.action, err);
  }
}
