import { createAdminClient } from "@/lib/supabase/admin";

// Single source of truth for "when is a booking allowed to become confirmed."
// Locked by Phase C Feature 1: a booking may only move to `confirmed` once it
// has BOTH a schedule (date/time) and a signed consent form — whichever of
// the two lands second is the one that triggers the transition. Used by
// assignSchedule() (app/(owner)/owner/bookings/[bookingId]/actions.ts),
// POST /api/consent-forms, and markCompleted() (same actions file, as a
// defensive re-check — see that function's comment for why).
export function isReadyToConfirm(hasSchedule: boolean, hasConsent: boolean): boolean {
  return hasSchedule && hasConsent;
}

export async function bookingHasConsent(
  supabase: ReturnType<typeof createAdminClient>,
  bookingId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("consent_forms")
    .select("id")
    .eq("booking_id", bookingId)
    .maybeSingle();
  return Boolean(data);
}
