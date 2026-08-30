import { createAdminClient } from "@/lib/supabase/admin";

// Guest consultations submitted via the public, unauthenticated
// /book/[studio]/consult wizard have no client_account_id of their own —
// ownership inside the portal (Projects, Dashboard, My Bookings, History) is
// resolved entirely through a submitted `ai_chats` row linking
// client_account_id -> consultation_id (see lib/client-portal/projects.ts).
// That row only ever gets created by the portal's OWN chat-based consultation
// flow (app/portal/[studio]/consultation/actions.ts). A client who fills the
// public wizard BEFORE ever creating a portal account — the most common real
// order: browse -> consult -> get quoted -> THEN log in to pay/track — had no
// way to ever see that consultation once they logged in, because nothing
// created that link for them. Found during the 2026-08-29 flagship QA
// journey; root cause confirmed by tracing getClientProjects() and
// getLatestSubmittedConsultation() back to their sole ai_chats-based
// ownership check.
//
// This backfills that link: on every portal page load (called once from the
// shared portal layout, so it covers Projects/Dashboard/Bookings/History/etc
// in one place), claim any of this studio's own guest consultations whose
// client_email case-insensitively matches the now-OTP-verified account email
// — scoped to this studio only, and only consultations with no existing
// ai_chats link at all (never re-claims one already linked to a real portal
// chat, this account's or otherwise). Additive only: no schema change, no
// RLS/auth change, no existing write path touched.
export async function reconcileGuestConsultations(
  studioId: string,
  clientAccountId: string,
  email: string
): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return;

  const supabase = createAdminClient();

  // Exact case-insensitive match done in application code, not via
  // .ilike() — ilike patterns treat "_" and "%" as SQL wildcards, and
  // `normalizedEmail` here is the authenticated user's own email (which
  // commonly contains "_"), so a naive .ilike() would wildcard-match and
  // leak a *different* guest's similarly-spelled consultation into this
  // account. Studio-scoped candidate set is small enough to filter here.
  const { data: guestConsults } = await supabase
    .from("consultations")
    .select("id, client_email")
    .eq("studio_id", studioId);

  const rows = ((guestConsults ?? []) as { id: string; client_email: string | null }[]).filter(
    (r) => r.client_email?.trim().toLowerCase() === normalizedEmail
  );
  if (rows.length === 0) return;

  for (const row of rows) {
    const { data: existingLink } = await supabase
      .from("ai_chats")
      .select("id")
      .eq("consultation_id", row.id)
      .maybeSingle();
    if (existingLink) continue;

    await supabase.from("ai_chats").insert({
      studio_id: studioId,
      client_account_id: clientAccountId,
      status: "submitted",
      consultation_id: row.id,
    } as never);
  }
}
