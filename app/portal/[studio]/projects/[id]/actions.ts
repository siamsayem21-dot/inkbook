"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { ensureClientAccount } from "@/lib/auth/config";
import { getOrCreateDepositCheckoutSession, capDepositAmountCents } from "@/lib/stripe/deposit-checkout";
import { getOrCreateThread } from "@/lib/messaging/threads";

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

type ConsultForDeposit = {
  id: string;
  studio_id: string;
  status: string;
  quote_accepted_at: string | null;
  final_price: number | null;
  artist_id: string | null;
  booking_id: string | null;
  client_name: string;
  client_email: string;
  client_phone: string;
  tattoo_description: string;
  detected_style: string | null;
};

// Starts (or resumes) the client's self-serve deposit checkout for an
// accepted quote. Reuses the exact same infrastructure as the owner's
// existing "send deposit link" flow:
//   - getOrCreateDepositCheckoutSession() (lib/stripe/deposit-checkout.ts) —
//     the shared Stripe Checkout Session + deposit_payments creation/reuse
//     helper, already used by sendDepositRequest() in
//     app/(owner)/owner/bookings/[bookingId]/actions.ts.
//   - capDepositAmountCents() — the same deposit-vs-quote capping rule
//     bookConsultation() uses (app/book/[studio]/consult/actions.ts).
//   - The same `bookings` table and the same Stripe webhook
//     (app/api/stripe/webhook/route.ts) that already processes
//     deposit_payments-flow payments — no webhook logic is duplicated here.
//
// The one thing this flow does differently from the owner-driven path: it
// creates the `bookings` row itself (status "pending_deposit", no date/time —
// the owner assigns those afterward), because until now only the owner could
// create a booking from a consultation. This mirrors the existing
// custom_requests deposit flow's "awaiting_schedule" pattern (see
// supabase/migrations/20260623000005_process_custom_request_deposit_rpc.sql)
// rather than inventing a new one — see the matching comment in the webhook.
export async function continueToDeposit(projectId: string): Promise<{ checkoutUrl?: string; error?: string }> {
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
  if (!chat) return { error: "Invalid project." };

  const { data: consultRow, error: readError } = await supabase
    .from("consultations")
    .select(
      "id, studio_id, status, quote_accepted_at, final_price, artist_id, booking_id, " +
        "client_name, client_email, client_phone, tattoo_description, detected_style"
    )
    .eq("id", projectId)
    .maybeSingle();

  if (readError) {
    console.error("[continueToDeposit] read failed:", readError.message);
    return { error: "Deposit checkout isn't available yet — please try again shortly." };
  }
  const consult = consultRow as ConsultForDeposit | null;
  if (!consult) return { error: "Invalid project." };

  if (!consult.quote_accepted_at) {
    return { error: "Please accept your quote before continuing to deposit." };
  }
  if (!consult.final_price || consult.final_price <= 0) {
    return { error: "This project doesn't have a finalized quote amount yet — please check back soon." };
  }
  if (!consult.artist_id) {
    return { error: "No artist has been assigned to this project yet — please check back soon." };
  }

  const { data: studioRow } = await supabase
    .from("studios")
    .select("id, name, subdomain, deposit_amount_cents")
    .eq("id", consult.studio_id)
    .maybeSingle();
  const studio = studioRow as { id: string; name: string; subdomain: string; deposit_amount_cents: number } | null;
  if (!studio) return { error: "Invalid project." };

  const { data: artistRow } = await supabase
    .from("artists")
    .select("id, name")
    .eq("id", consult.artist_id)
    .maybeSingle();
  const artist = artistRow as { id: string; name: string } | null;
  if (!artist) return { error: "No artist has been assigned to this project yet — please check back soon." };

  // ── Find or create the booking this deposit attaches to ──────────────────
  let booking: { id: string; status: string; deposit_paid: boolean; deposit_amount_cents: number } | null = null;

  if (consult.booking_id) {
    const { data: existingBooking } = await supabase
      .from("bookings")
      .select("id, status, deposit_paid, deposit_amount_cents")
      .eq("id", consult.booking_id)
      .maybeSingle();
    booking = existingBooking as typeof booking;
  }

  if (!booking) {
    const { data: existingClient } = await supabase
      .from("clients")
      .select("id")
      .eq("studio_id", consult.studio_id)
      .eq("email", consult.client_email)
      .maybeSingle();

    let clientId = (existingClient as { id: string } | null)?.id;
    if (!clientId) {
      const { data: newClient, error: clientErr } = await supabase
        .from("clients")
        .insert({
          studio_id: consult.studio_id,
          full_name: consult.client_name,
          email: consult.client_email,
          phone: consult.client_phone,
        } as never)
        .select("id")
        .single();
      if (clientErr || !newClient) {
        console.error("[continueToDeposit] client insert failed:", clientErr?.message);
        return { error: "Failed to set up your client record — please try again." };
      }
      clientId = (newClient as { id: string }).id;
    }

    const quoteAmountCents = Math.round(consult.final_price * 100);
    const depositAmountCents = capDepositAmountCents(studio.deposit_amount_cents, quoteAmountCents);

    const { data: newBooking, error: bookingErr } = await supabase
      .from("bookings")
      .insert({
        studio_id: consult.studio_id,
        artist_id: consult.artist_id,
        client_id: clientId,
        date: null,
        time: null,
        style: consult.detected_style ?? "Custom",
        description: consult.tattoo_description,
        status: "pending_deposit",
        deposit_amount_cents: depositAmountCents,
        total_amount_cents: quoteAmountCents,
        deposit_paid: false,
      } as never)
      .select("id, status, deposit_paid, deposit_amount_cents")
      .single();

    if (bookingErr || !newBooking) {
      console.error("[continueToDeposit] booking insert failed:", bookingErr?.message);
      return { error: "Failed to start your deposit — please try again." };
    }

    booking = newBooking as typeof booking;

    const { error: linkError } = await supabase
      .from("consultations")
      .update({ booking_id: booking!.id } as never)
      .eq("id", projectId);
    if (linkError) console.error("[continueToDeposit] failed to link booking to consultation:", linkError.message);
  }

  if (booking!.deposit_paid) {
    return { error: "Your deposit has already been paid — the studio will confirm your booking soon." };
  }
  if (booking!.status === "cancelled") {
    return { error: "This booking window expired before the deposit was paid. Please contact the studio to restart." };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const returnPath = `/portal/${studio.subdomain}/projects/${projectId}`;

  const result = await getOrCreateDepositCheckoutSession({
    bookingId: booking!.id,
    depositAmountCents: booking!.deposit_amount_cents,
    artistId: artist.id,
    artistName: artist.name,
    studioName: studio.name,
    clientEmail: consult.client_email,
    successUrl: `${baseUrl}${returnPath}?checkout=success`,
    cancelUrl: `${baseUrl}${returnPath}?checkout=cancelled`,
  });

  if (result.error) return { error: result.error };
  return { checkoutUrl: result.checkoutUrl };
}

// Opens (or creates) this project's message thread — see lib/messaging/threads.ts.
// QuoteActions.tsx navigates the client to /portal/[studio]/messages/[threadId]
// on success rather than sending a message inline from here.
export async function askQuoteQuestion(projectId: string): Promise<{ threadId?: string; error?: string }> {
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

  const { data: consultRow } = await supabase
    .from("consultations")
    .select("studio_id, artist_id")
    .eq("id", projectId)
    .maybeSingle();
  const consult = consultRow as { studio_id: string; artist_id: string | null } | null;
  if (!consult) return { error: "Project not found." };

  const result = await getOrCreateThread({
    studioId: consult.studio_id,
    clientAccountId: account.id,
    consultationId: projectId,
    artistId: consult.artist_id,
  });
  if (result.error || !result.thread) return { error: result.error ?? "Failed to open conversation." };
  return { threadId: result.thread.id };
}
