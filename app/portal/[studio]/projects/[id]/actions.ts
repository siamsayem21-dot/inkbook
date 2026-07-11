"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { ensureClientAccount } from "@/lib/auth/config";

// Persists the client's "Accept Quote" action onto
// consultations.quote_accepted_at (see
// supabase/migrations/20260711000001_quote_acceptance.sql). Ownership is
// checked the same way as everywhere else in the client portal: through the
// submitted `ai_chats` row that links this client account to the
// consultation, since `consultations` has no client_account_id of its own
// (lib/client-portal/projects.ts has the full explanation).
//
// Idempotent — accepting an already-accepted quote just returns the existing
// timestamp instead of erroring or overwriting it.
export async function acceptQuote(projectId: string): Promise<{ acceptedAt?: string; error?: string }> {
  const account = await ensureClientAccount();
  if (!account) return { error: "Not signed in." };

  const supabase = createAdminClient();

  const { data: chat } = await supabase
    .from("ai_chats")
    .select("id")
    .eq("client_account_id", account.id)
    .eq("status", "submitted")
    .eq("consultation_id", projectId)
    .maybeSingle();
  if (!chat) return { error: "Project not found." };

  const { data: consultRow, error: readError } = await supabase
    .from("consultations")
    .select("status, quote_accepted_at")
    .eq("id", projectId)
    .maybeSingle();

  if (readError) {
    console.error("[acceptQuote] read failed:", readError.message);
    return { error: "Quote acceptance isn't available yet — please try again shortly." };
  }

  const consult = consultRow as { status: string; quote_accepted_at: string | null } | null;
  if (!consult) return { error: "Project not found." };
  if (consult.quote_accepted_at) return { acceptedAt: consult.quote_accepted_at };
  if (consult.status !== "quoted") return { error: "This project doesn't have an active quote to accept." };

  const acceptedAt = new Date().toISOString();
  const { error: writeError } = await supabase
    .from("consultations")
    .update({ quote_accepted_at: acceptedAt } as never)
    .eq("id", projectId);

  if (writeError) {
    console.error("[acceptQuote] write failed:", writeError.message);
    return { error: "Failed to accept the quote — please try again." };
  }

  return { acceptedAt };
}

// TODO(deposit-payment): Wire this to Stripe Checkout for the client portal's
// self-serve "pay deposit" flow, once a quote has been accepted (this button
// only renders after acceptQuote() above succeeds). lib/stripe/deposit-checkout.ts
// already has getOrCreateDepositCheckoutSession() scaffolded for exactly this —
// once a quoted project can produce/locate a booking + deposit_payments row from
// here, call it with that booking's fields and return the checkoutUrl for the
// client to redirect (or open) into. Needs: booking creation from a quote (today
// bookConsultation() in app/book/[studio]/consult/actions.ts is owner-only), and
// a success/cancel URL back into /portal/[studio]/projects/[id].
export async function continueToDeposit(projectId: string): Promise<{ error?: string }> {
  void projectId;
  return { error: "Deposit payments aren't available yet — check back soon." };
}

// TODO(messaging): Wire this to the client portal messaging system once that step
// is built (see the "Messages" nav placeholder at app/portal/[studio]/messages/).
// Needs: a thread keyed by studio + client (+ optionally this project), a message
// row insert here, and a notification to the studio/artist.
export async function askQuoteQuestion(projectId: string, message?: string): Promise<{ error?: string }> {
  void projectId;
  void message;
  return { error: "Messaging isn't available yet — check back soon." };
}
