import { createAdminClient } from "@/lib/supabase/admin";

// Client-facing 7-stage timeline. Deliberately NOT a 1:1 mapping of
// consultations.status — "Quote Accepted" has no status value of its own (see
// supabase/migrations/20260711000001_quote_acceptance.sql: status stays
// "quoted" through acceptance) and "Deposit Paid" / "Booking Confirmed" need to
// be told apart even though today's Stripe webhook happens to set both at the
// same instant (app/api/stripe/webhook/route.ts). Stage is derived from four
// independent real signals instead, so the display stays correct as those
// signals decouple in future steps (e.g. the client self-serve deposit flow).
export const PROJECT_STAGES = [
  "Consultation Submitted",
  "Under Review",
  "Quote Ready",
  "Quote Accepted",
  "Deposit Paid",
  "Booking Confirmed",
  "Completed",
] as const;

export type ProjectStageInput = {
  status: string;                 // consultations.status
  quoteAcceptedAt: string | null; // consultations.quote_accepted_at
  depositPaidAt: string | null;   // bookings.deposit_paid_at (via consultations.booking_id)
  bookingStatus: string | null;   // bookings.status — null when no booking row exists yet
};

// Coarse baseline from consultations.status alone — refined upward below by
// the finer-grained signals. Never used to move the stage backward.
const STATUS_FLOOR: Record<string, number> = {
  new: 0,
  reviewed: 1,
  quoted: 2,
  // "booked" is set by the owner-driven bookConsultation() action
  // (app/book/[studio]/consult/actions.ts) when the OWNER manually books a
  // quoted consultation, before any deposit is collected. It is NOT the same
  // as the client-facing "Booking Confirmed" stage — that's driven by
  // bookingStatus === "confirmed" below, which happens later (on deposit
  // payment) in the current flow.
  booked: 2,
  deposit_paid: 4,
  completed: 6,
  converted: 6, // legacy alias — see lib/pipeline.ts's getStage()
  lost: 0,
};

// Pure function — no DB access. See fetchBookingSignals() below for how
// depositPaidAt/bookingStatus get populated from the `bookings` table.
export function deriveProjectStage(input: ProjectStageInput): number {
  const { status, quoteAcceptedAt, depositPaidAt, bookingStatus } = input;

  let stage = STATUS_FLOOR[status] ?? 0;

  // "Quote Accepted" (stage 3): quote_accepted_at is the primary source of
  // truth — it's the real, client-authored signal this feature adds. A
  // booking existing is consulted ONLY as a legacy compatibility fallback for
  // consultations booked before this feature existed (the owner can still
  // manually book a quoted consultation from /owner/consultations without the
  // client ever visiting the portal — bookConsultation() in
  // app/book/[studio]/consult/actions.ts, unchanged, owner-only). The fallback
  // never runs when quote_accepted_at is already set, so booking existence can
  // never override or outrank a real acceptance signal.
  if (quoteAcceptedAt) {
    stage = Math.max(stage, 3);
  } else if (bookingStatus) {
    stage = Math.max(stage, 3);
  }

  if (depositPaidAt) stage = Math.max(stage, 4);

  if (bookingStatus === "confirmed" || bookingStatus === "completed") {
    stage = Math.max(stage, 5);
  }

  // Terminal states always win over the signals above.
  if (status === "completed" || status === "converted") stage = 6;
  if (status === "lost") stage = 0;

  return stage;
}

export type BookingSignals = { depositPaidAt: string | null; bookingStatus: string | null };

// Shared by lib/ai-consultation/session.ts (Dashboard / Consultation banners)
// and lib/client-portal/projects.ts (Project Details) so this lookup isn't
// duplicated in both places.
export async function fetchBookingSignals(
  supabase: ReturnType<typeof createAdminClient>,
  bookingId: string | null
): Promise<BookingSignals> {
  if (!bookingId) return { depositPaidAt: null, bookingStatus: null };

  const { data } = await supabase
    .from("bookings")
    .select("status, deposit_paid_at")
    .eq("id", bookingId)
    .maybeSingle();

  const row = data as { status: string; deposit_paid_at: string | null } | null;
  return { depositPaidAt: row?.deposit_paid_at ?? null, bookingStatus: row?.status ?? null };
}
