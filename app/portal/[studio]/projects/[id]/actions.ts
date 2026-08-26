"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { ensureClientAccount } from "@/lib/auth/config";
import { getOrCreateDepositCheckoutSession, capDepositAmountCents } from "@/lib/stripe/deposit-checkout";
import { clientFacingPaymentError } from "@/lib/stripe/connect";
import { getOrCreateThread } from "@/lib/messaging/threads";
import { getBalanceDueCents } from "@/lib/booking-balance";

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

  // Blacklist check — same is_client_blacklisted() RPC the classic /api/bookings
  // and /api/custom-requests flows are backed by, checked here (not earlier, at
  // consultation submission) to match that same precedent: gate at the point a
  // real booking/deposit record is about to be created, not at initial inquiry.
  const { data: isBlacklisted } = await supabase.rpc("is_client_blacklisted" as never, {
    p_studio_id: consult.studio_id,
    p_email: consult.client_email,
    p_phone: consult.client_phone,
  } as never);
  if (isBlacklisted) {
    return { error: "Booking cannot be completed. Please contact the studio directly." };
  }

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

  if (result.error) return { error: clientFacingPaymentError(result.error) };
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

// Client self-serve remaining-balance payment (Phase C Feature 2). Reuses the
// exact same getOrCreateDepositCheckoutSession() helper as continueToDeposit()
// above (paymentType: "remainder" instead of the default "deposit") and the
// same Stripe webhook that already processes both. Keyed by bookingId rather
// than projectId, since it's called from the booking-detail page
// (lib/client-portal/bookings.ts) rather than the project page — ownership is
// proven the same way getClientBookingDetail() does: a submitted ai_chats row
// linking this client account to a consultation whose booking_id matches.
export async function payRemainderBalance(bookingId: string): Promise<{ checkoutUrl?: string; error?: string }> {
  const account = await ensureClientAccount();
  if (!account) return { error: "Not signed in." };

  const supabase = createAdminClient();

  const { data: chatRows } = await supabase
    .from("ai_chats")
    .select("consultation_id")
    .eq("client_account_id", account.id)
    .eq("status", "submitted")
    .not("consultation_id", "is", null);

  const consultationIds = Array.from(
    new Set(
      ((chatRows ?? []) as { consultation_id: string | null }[])
        .map((r) => r.consultation_id)
        .filter((id): id is string => Boolean(id))
    )
  );
  if (consultationIds.length === 0) return { error: "Booking not found." };

  const { data: consultRow } = await supabase
    .from("consultations")
    .select("studio_id")
    .in("id", consultationIds)
    .eq("booking_id", bookingId)
    .maybeSingle();
  const consult = consultRow as { studio_id: string } | null;
  if (!consult) return { error: "Booking not found." };

  const { data: bookingRow } = await supabase
    .from("bookings")
    .select("id, artist_id, client_id, deposit_amount_cents, total_amount_cents, quote_amount_cents, remainder_collected")
    .eq("id", bookingId)
    .maybeSingle();
  const booking = bookingRow as {
    id: string; artist_id: string; client_id: string;
    deposit_amount_cents: number; total_amount_cents: number | null; quote_amount_cents: number | null;
    remainder_collected: boolean;
  } | null;
  if (!booking) return { error: "Booking not found." };

  if (booking.remainder_collected) {
    return { error: "Your remaining balance has already been paid." };
  }

  const balanceDueCents = getBalanceDueCents(booking);
  if (balanceDueCents === null || balanceDueCents <= 0) {
    return { error: "There is no remaining balance to pay." };
  }

  const [{ data: studioRow }, { data: artistRow }, { data: clientRow }] = await Promise.all([
    supabase.from("studios").select("name, subdomain").eq("id", consult.studio_id).maybeSingle(),
    supabase.from("artists").select("name").eq("id", booking.artist_id).maybeSingle(),
    supabase.from("clients").select("email").eq("id", booking.client_id).maybeSingle(),
  ]);
  const studio = studioRow as { name: string; subdomain: string } | null;
  const artist = artistRow as { name: string } | null;
  const client = clientRow as { email: string } | null;
  if (!studio) return { error: "Booking not found." };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const returnPath = `/portal/${studio.subdomain}/bookings/${bookingId}`;

  const result = await getOrCreateDepositCheckoutSession({
    bookingId,
    depositAmountCents: balanceDueCents,
    artistId: booking.artist_id,
    artistName: artist?.name ?? "Artist",
    studioName: studio.name,
    clientEmail: client?.email,
    paymentType: "remainder",
    successUrl: `${baseUrl}${returnPath}?checkout=success`,
    cancelUrl: `${baseUrl}${returnPath}?checkout=cancelled`,
  });

  if (result.error) return { error: clientFacingPaymentError(result.error) };
  return { checkoutUrl: result.checkoutUrl };
}

// Client review submission (Phase C Feature 5). Reuses the reviews table
// and its existing moderation mechanism (is_public/is_active) added in
// 20260708000000_public_studio_page.sql for owner-entered testimonials —
// nothing new is invented here, a client-submitted review is just another
// row in the same table, defaulting is_public: false so nothing goes live
// on the public studio page until the owner approves it. Ownership proven
// the same ai_chats -> consultations.booking_id chain as payRemainderBalance().
export async function submitReview(
  bookingId: string,
  rating: number,
  quote: string
): Promise<{ error?: string }> {
  const account = await ensureClientAccount();
  if (!account) return { error: "Not signed in." };

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Rating must be between 1 and 5 stars." };
  }
  const trimmedQuote = quote.trim();
  if (!trimmedQuote) return { error: "Please write a short review." };

  const supabase = createAdminClient();

  const { data: chatRows } = await supabase
    .from("ai_chats")
    .select("consultation_id")
    .eq("client_account_id", account.id)
    .eq("status", "submitted")
    .not("consultation_id", "is", null);

  const consultationIds = Array.from(
    new Set(
      ((chatRows ?? []) as { consultation_id: string | null }[])
        .map((r) => r.consultation_id)
        .filter((id): id is string => Boolean(id))
    )
  );
  if (consultationIds.length === 0) return { error: "Booking not found." };

  const { data: consultRow } = await supabase
    .from("consultations")
    .select("studio_id")
    .in("id", consultationIds)
    .eq("booking_id", bookingId)
    .maybeSingle();
  const consult = consultRow as { studio_id: string } | null;
  if (!consult) return { error: "Booking not found." };

  const { data: bookingRow } = await supabase
    .from("bookings")
    .select("id, status, client_id")
    .eq("id", bookingId)
    .maybeSingle();
  const booking = bookingRow as { id: string; status: string; client_id: string } | null;
  if (!booking) return { error: "Booking not found." };
  if (booking.status !== "completed") {
    return { error: "Reviews can only be left after your session is completed." };
  }

  const { data: existingReview } = await supabase
    .from("reviews")
    .select("id")
    .eq("booking_id", bookingId)
    .maybeSingle();
  if (existingReview) return { error: "You've already left a review for this booking." };

  const { data: clientRow } = await supabase.from("clients").select("full_name").eq("id", booking.client_id).maybeSingle();
  const authorName = (clientRow as { full_name: string } | null)?.full_name ?? "Anonymous";

  const { error } = await supabase
    .from("reviews")
    .insert({
      studio_id: consult.studio_id,
      booking_id: bookingId,
      client_account_id: account.id,
      author_name: authorName,
      rating,
      quote: trimmedQuote,
      is_public: false,
      is_active: true,
    } as never);

  if (error) {
    console.error("[submitReview]", error.message);
    // 23505 = unique_violation — the DB-level UNIQUE(booking_id) guard caught
    // a race the pre-check above missed (e.g. a double-submit).
    if ((error as { code?: string }).code === "23505") {
      return { error: "You've already left a review for this booking." };
    }
    return { error: "Failed to submit your review — please try again." };
  }

  return {};
}
