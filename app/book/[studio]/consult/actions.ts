"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioId } from "@/lib/auth/config";
import { validateImageFile } from "@/lib/file-validation";
import { capDepositAmountCents } from "@/lib/stripe/deposit-checkout";
import { isAtMonthlyCap } from "@/lib/waitlist";
import { getStage, isAllowedStatusTransition, isForwardSystemTransition, TERMINAL_STATUSES } from "@/lib/pipeline";
import { withIdempotency } from "@/lib/idempotency";
import { checkRateLimit } from "@/lib/rate-limit";

export async function submitConsultation(
  formData: FormData
): Promise<{ id?: string; error?: string }> {
  const studioId        = formData.get("studioId")       as string | null;
  const clientName      = (formData.get("clientName")    as string | null)?.trim();
  const clientEmail     = (formData.get("clientEmail")   as string | null)?.trim();
  const clientPhone     = (formData.get("clientPhone")   as string | null)?.trim();
  const description     = (formData.get("description")   as string | null)?.trim();
  const placement       = (formData.get("placement")     as string | null)?.trim();
  const size            = formData.get("size")           as string | null;
  const colorPreference = formData.get("colorPreference") as string | null;
  const budgetRange     = formData.get("budgetRange")    as string | null;
  const detectedStyle   = formData.get("detectedStyle")  as string | null;
  const styleConfidence = parseFloat(formData.get("styleConfidence") as string || "0");
  const styleReasoning  = (formData.get("styleReasoning") as string | null) ?? "";
  const aiNotes         = (formData.get("aiNotes")       as string | null) ?? "";
  const questionsRaw    = formData.get("questions")      as string | null;
  const answersRaw      = formData.get("answers")        as string | null;
  const photoFiles      = formData.getAll("photos")      as File[];

  if (!studioId || !clientName || !clientEmail || !clientPhone ||
      !description || !placement || !size || !colorPreference || !budgetRange) {
    return { error: "Missing required fields" };
  }

  // DEFERRED_ISSUES.md #10 (in-scope per strict completion mission):
  // consultation creation itself previously had no app-level rate limit
  // (only its downstream AI sub-routes did).
  const h = headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() ?? h.get("x-real-ip") ?? "unknown";
  const rl = checkRateLimit(`consult-submit:${ip}`, 10, 10 * 60 * 1000); // 10 per 10 min
  if (!rl.allowed) {
    return { error: "Too many submissions. Please wait a bit before trying again." };
  }

  let followupQuestions: string[] = [];
  let followupAnswers: Record<string, string> = {};
  try { followupQuestions = JSON.parse(questionsRaw ?? "[]"); } catch {}
  try { followupAnswers   = JSON.parse(answersRaw   ?? "{}"); } catch {}

  const supabase = createAdminClient();

  // Duplicate-submission guard (flaky network retry, accidental double
  // form-resubmit) — a repeat call with the same studio+client+description
  // within the TTL window returns the first call's result instead of
  // inserting (and uploading photos for) a second consultation row.
  // In-process only, no schema change — see lib/idempotency.ts.
  const idempotencyKey = [
    studioId,
    clientEmail.toLowerCase(),
    clientPhone.replace(/\D/g, ""),
    description.toLowerCase(),
  ].join("|");

  return withIdempotency(
    idempotencyKey,
    async (): Promise<{ id?: string; error?: string }> => {
      // Upload reference photos
      const photoUrls: string[] = [];
      for (const file of photoFiles) {
        if (!file || file.size === 0) continue;
        if (file.size > 8 * 1024 * 1024) continue;
        const typeCheck = await validateImageFile(file);
        if (!typeCheck.valid) continue; // skip non-image files silently
        const ext  = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `consultations/${studioId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const bytes = await file.arrayBuffer();
        const { error: upErr } = await supabase.storage
          .from("custom-requests")
          .upload(path, bytes, { contentType: file.type, upsert: false });
        if (!upErr) {
          const { data } = supabase.storage.from("custom-requests").getPublicUrl(path);
          photoUrls.push(data.publicUrl);
        }
      }

      const { data: row, error } = await supabase
        .from("consultations")
        .insert({
          studio_id:          studioId,
          client_name:        clientName,
          client_email:       clientEmail,
          client_phone:       clientPhone,
          tattoo_description: description,
          placement,
          estimated_size:     size,
          color_preference:   colorPreference,
          budget_range:       budgetRange,
          reference_photos:   photoUrls,
          followup_questions: followupQuestions,
          followup_answers:   followupAnswers,
          detected_style:     detectedStyle || null,
          style_confidence:   isNaN(styleConfidence) ? null : styleConfidence,
          style_reasoning:    styleReasoning || null,
          ai_notes:           aiNotes || null,
          status:             "new" as const,
        } as never)
        .select("id")
        .single();

      if (error || !row) {
        console.error("[submitConsultation]", error?.message);
        return { error: "Failed to save your consultation — please try again" };
      }

      return { id: (row as { id: string }).id };
    },
    { shouldCache: (result) => Boolean(result.id) }
  );
}

export async function saveConsultationQuote(
  id: string,
  data: {
    priceLow:      number;
    priceHigh:     number;
    sessions:      number;
    hoursRange:    string;
    difficulty:    string;
    reasoning:     string;
    finalPrice:    number;
    finalSessions: number;
    notes:         string;
  }
): Promise<{ error?: string }> {
  const callerStudioId = await getStudioId();
  if (!callerStudioId) return { error: "Unauthorized" };

  const supabase = createAdminClient();

  // Read current status before writing — never downgrade a status that has
  // already advanced past "quoted" (e.g. deposit_paid, booked, completed).
  const { data: current } = await supabase
    .from("consultations")
    .select("status")
    .eq("id", id)
    .eq("studio_id" as never, callerStudioId)
    .maybeSingle();

  const currentStatus = (current as { status: string } | null)?.status ?? "new";

  // Completed/Lost consultations are terminal — the quote (and everything else
  // on this record) is historical at that point, not an active workflow to edit.
  if (TERMINAL_STATUSES.has(getStage(currentStatus).value)) {
    return { error: "This consultation is closed — its quote can no longer be edited." };
  }

  const canAdvanceToQuoted = isForwardSystemTransition(currentStatus, "quoted");

  const { error } = await supabase
    .from("consultations")
    .update({
      ai_recommended_price_min: data.priceLow,
      ai_recommended_price_max: data.priceHigh,
      ai_estimated_sessions:    data.sessions,
      ai_estimated_hours:       data.hoursRange,
      ai_difficulty:            data.difficulty,
      ai_quote_reasoning:       data.reasoning,
      final_price:              data.finalPrice    || null,
      final_sessions:           data.finalSessions || null,
      quote_notes:              data.notes         || null,
      quote_status:             "saved",
      ...(canAdvanceToQuoted ? { status: "quoted" } : {}),
    } as never)
    .eq("id", id)
    .eq("studio_id" as never, callerStudioId);

  if (error) return { error: error.message };
  return {};
}

export async function updateConsultationStatus(
  id: string,
  status: "new" | "reviewed" | "quoted" | "deposit_paid" | "booked" | "completed" | "lost" | "converted"
): Promise<{ error?: string }> {
  const callerStudioId = await getStudioId();
  if (!callerStudioId) return { error: "Unauthorized" };

  const supabase = createAdminClient();

  // Read current status before writing — this is the single choke point both
  // the consultation detail page's status pills and the Pipeline board's
  // per-card status dropdown go through, so the regression guard lives here
  // rather than in either caller's UI.
  const { data: current } = await supabase
    .from("consultations")
    .select("status")
    .eq("id", id)
    .eq("studio_id" as never, callerStudioId)
    .maybeSingle();

  const currentStatus = (current as { status: string } | null)?.status;
  if (currentStatus === undefined) return { error: "Consultation not found." };

  if (!isAllowedStatusTransition(currentStatus, status)) {
    const reason =
      getStage(status).value === "booked"
        ? "Booked can only be set by confirming an appointment with a valid artist, date, and time."
        : TERMINAL_STATUSES.has(getStage(currentStatus).value)
          ? "this consultation is closed."
          : "that would move it backward in the lifecycle.";
    return {
      error: `Cannot move from "${getStage(currentStatus).label}" to "${getStage(status).label}" — ${reason}`,
    };
  }

  const { error } = await supabase
    .from("consultations")
    .update({ status } as never)
    .eq("id", id)
    .eq("studio_id" as never, callerStudioId);

  if (error) return { error: error.message };
  return {};
}

type ConsultForBooking = {
  id: string;
  studio_id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  detected_style: string | null;
  status: string;
  booking_id: string | null;
  final_price: number | null;
};

// Shared by startConsultationDeposit() and bookConsultation()'s manual-override
// path — same find-or-create-by-email pattern continueToDeposit() (the client
// self-serve twin, app/portal/[studio]/projects/[id]/actions.ts) also uses.
async function findOrCreateClient(
  supabase: ReturnType<typeof createAdminClient>,
  studioId: string,
  fullName: string,
  email: string,
  phone: string
): Promise<string | null> {
  const { data: existingClient } = await supabase
    .from("clients")
    .select("id")
    .eq("studio_id", studioId)
    .eq("email", email)
    .maybeSingle();
  if (existingClient) return (existingClient as { id: string }).id;

  const { data: newClient, error } = await supabase
    .from("clients")
    .insert({ studio_id: studioId, full_name: fullName, email, phone } as never)
    .select("id")
    .single();
  if (error || !newClient) return null;
  return (newClient as { id: string }).id;
}

// Blacklist check shared by startConsultationDeposit() and bookConsultation() —
// same is_client_blacklisted() RPC continueToDeposit() is backed by.
async function isBlacklistedClient(
  supabase: ReturnType<typeof createAdminClient>,
  studioId: string,
  email: string,
  phone: string
): Promise<boolean> {
  const { data } = await supabase.rpc("is_client_blacklisted" as never, {
    p_studio_id: studioId,
    p_email: email,
    p_phone: phone,
  } as never);
  return Boolean(data);
}

// Starts Stripe deposit collection for a Quoted consultation. Creates (or, if
// one already exists, reuses) a provisional booking with no date/time yet —
// status "pending_deposit", same shape continueToDeposit() (the client
// self-serve twin) already creates — purely so there's a bookings row to
// attach the deposit payment/Stripe checkout session to. Deliberately does
// NOT touch consultation.status: it stays "quoted" until the Stripe webhook
// confirms payment (handleDepositPayment advances Quoted -> Deposit Paid).
// The booking itself lands in "awaiting_schedule" once paid (no date/time
// yet) via that same existing webhook logic — no new schema needed.
export async function startConsultationDeposit(
  consultId: string,
  artistId: string
): Promise<{ error?: string; bookingId?: string }> {
  if (!artistId) return { error: "Select an artist first." };

  const callerStudioId = await getStudioId();
  if (!callerStudioId) return { error: "Unauthorized" };

  const supabase = createAdminClient();

  const { data: consult } = await supabase
    .from("consultations")
    .select("id, studio_id, client_name, client_email, client_phone, detected_style, status, booking_id, final_price")
    .eq("id", consultId)
    .eq("studio_id" as never, callerStudioId)
    .maybeSingle();

  if (!consult) return { error: "Consultation not found." };
  const c = consult as ConsultForBooking;

  // Idempotency guard — a provisional (or later) booking already exists.
  // Reuse it rather than creating a second one.
  if (c.booking_id) return { bookingId: c.booking_id };

  if (getStage(c.status).value !== "quoted") {
    return { error: "A deposit can only be requested once the consultation has been quoted." };
  }
  if (!c.final_price || c.final_price <= 0) {
    return { error: "This consultation doesn't have a finalized quote amount yet." };
  }

  // Ownership check — artistId is caller-supplied; without this, an owner
  // could assign another studio's artist to this booking, and that artist
  // would then see this studio's client data via their own bookings query
  // (which filters on artist_id alone, not studio_id).
  const { data: artistOwnership } = await supabase
    .from("artists")
    .select("id")
    .eq("id", artistId)
    .eq("studio_id", callerStudioId)
    .maybeSingle();
  if (!artistOwnership) return { error: "Artist not found." };

  const { data: studio } = await supabase
    .from("studios")
    .select("id, deposit_amount_cents")
    .eq("id", c.studio_id)
    .maybeSingle();
  if (!studio) return { error: "Studio not found." };
  const s = studio as { id: string; deposit_amount_cents: number };

  if (await isBlacklistedClient(supabase, c.studio_id, c.client_email, c.client_phone)) {
    return { error: "This client is blacklisted at this studio and cannot be booked." };
  }

  const clientId = await findOrCreateClient(supabase, c.studio_id, c.client_name, c.client_email, c.client_phone);
  if (!clientId) return { error: "Failed to create client record." };

  const quoteAmountCents = Math.round(c.final_price * 100);
  const depositAmountCents = capDepositAmountCents(s.deposit_amount_cents, quoteAmountCents);

  const { data: booking, error: bookErr } = await supabase
    .from("bookings")
    .insert({
      studio_id:            c.studio_id,
      artist_id:            artistId,
      client_id:            clientId,
      date:                 null,
      time:                 null,
      style:                c.detected_style ?? "Custom",
      status:               "pending_deposit",
      deposit_amount_cents: depositAmountCents,
      deposit_paid:         false,
      quote_amount_cents:   quoteAmountCents,
    } as never)
    .select("id")
    .single();

  if (bookErr || !booking) return { error: "Failed to start deposit collection." };
  const bookingId = (booking as { id: string }).id;

  await supabase
    .from("consultations")
    .update({ artist_id: artistId, booking_id: bookingId } as never)
    .eq("id", consultId);

  return { bookingId };
}

// Finalizes an appointment once the deposit has been paid — the "Deposit Paid
// -> Booked" step. Called from the ConsultationDetail Book/Schedule
// Appointment form, which covers two cases:
//   (a) a provisional booking already exists (the normal path — created by
//       startConsultationDeposit() above while requesting the deposit): this
//       assigns it the chosen date/time/artist and confirms it — reusing the
//       existing booking, never creating a duplicate.
//   (b) no booking exists yet (a manual override — the owner marked the
//       deposit paid directly via the status pills, outside Stripe): this
//       creates one outright, already marked deposit-paid and confirmed.
// Either way this can only run once status is already "deposit_paid" — a
// Quoted consultation can never reach "booked" directly through this action.
export async function bookConsultation(
  consultId: string,
  data: {
    artistId: string;
    date: string; // YYYY-MM-DD
    time: string; // HH:MM
  }
): Promise<{ error?: string; bookingId?: string }> {
  if (!data.artistId || !data.date || !data.time) {
    return { error: "Artist, date, and time are required." };
  }

  const callerStudioId = await getStudioId();
  if (!callerStudioId) return { error: "Unauthorized" };

  const supabase = createAdminClient();

  const { data: consult } = await supabase
    .from("consultations")
    .select("id, studio_id, client_name, client_email, client_phone, detected_style, status, booking_id, final_price")
    .eq("id", consultId)
    .eq("studio_id" as never, callerStudioId)
    .maybeSingle();

  if (!consult) return { error: "Consultation not found." };
  const c = consult as ConsultForBooking;

  // ── Case (a): finalize the existing provisional booking ──────────────────
  if (c.booking_id) {
    const { data: existingRaw } = await supabase
      .from("bookings")
      .select("id, date, time")
      .eq("id", c.booking_id)
      .maybeSingle();
    const existing = existingRaw as { id: string; date: string | null; time: string | null } | null;
    if (!existing) return { error: "Linked booking not found." };

    // Fully idempotent regardless of status — already scheduled (Booked, or
    // Completed/Lost after the fact) means don't re-finalize, re-notify, or
    // duplicate. Checked before the terminal/deposit-paid gates below so a
    // second call against an already-booked consultation just returns the
    // existing booking instead of erroring.
    if (existing.date && existing.time) return { bookingId: c.booking_id };

    // Completed/Lost consultations are terminal — matches the read-only
    // detail view (this form is hidden there) and stops a stale/replayed
    // submission from finalizing a closed-out consultation.
    if (TERMINAL_STATUSES.has(getStage(c.status).value)) {
      return { error: "This consultation is closed and cannot be booked." };
    }

    // Only finalizable once the deposit has actually been paid — the rule
    // that keeps a Quoted consultation from ever becoming "booked" directly.
    if (getStage(c.status).value !== "deposit_paid") {
      return { error: "This consultation isn't ready to be booked yet — the deposit must be paid first." };
    }

    if (await isBlacklistedClient(supabase, c.studio_id, c.client_email, c.client_phone)) {
      return { error: "This client is blacklisted at this studio and cannot be booked." };
    }

    // Ownership check — data.artistId is caller-supplied; see the identical
    // comment in startConsultationDeposit() above for why this matters.
    const { data: artistRow } = await supabase
      .from("artists")
      .select("name, monthly_booking_cap")
      .eq("id", data.artistId)
      .eq("studio_id", callerStudioId)
      .maybeSingle();
    if (!artistRow) return { error: "Artist not found." };
    const artistForCap = artistRow as { name: string; monthly_booking_cap: number };
    if (await isAtMonthlyCap(supabase, data.artistId, artistForCap.monthly_booking_cap, data.date)) {
      return { error: `${artistForCap.name} is already at capacity for that month — choose a different date.` };
    }

    const { error: updateErr } = await supabase
      .from("bookings")
      .update({ artist_id: data.artistId, date: data.date, time: data.time, status: "confirmed" } as never)
      .eq("id", c.booking_id);
    if (updateErr) return { error: "Failed to confirm the appointment." };

    await supabase
      .from("consultations")
      .update({ artist_id: data.artistId, status: "booked" } as never)
      .eq("id", consultId);

    return { bookingId: c.booking_id };
  }

  // ── Case (b): no booking exists — deposit was marked paid manually,
  // outside the Stripe flow (e.g. cash/Venmo). Create one directly, already
  // confirmed, since the deposit is already known to be paid. ─────────────

  // Completed/Lost consultations are terminal — matches the read-only detail
  // view (this form is hidden there) and stops a stale/replayed submission
  // from booking a closed-out consultation.
  if (TERMINAL_STATUSES.has(getStage(c.status).value)) {
    return { error: "This consultation is closed and cannot be booked." };
  }

  // Only bookable once the deposit has actually been paid — the rule that
  // keeps a Quoted consultation from ever becoming "booked" directly.
  if (getStage(c.status).value !== "deposit_paid") {
    return { error: "This consultation isn't ready to be booked yet — the deposit must be paid first." };
  }

  const { data: studio } = await supabase
    .from("studios")
    .select("id, deposit_amount_cents")
    .eq("id", c.studio_id)
    .maybeSingle();
  if (!studio) return { error: "Studio not found." };
  const s = studio as { id: string; deposit_amount_cents: number };

  if (await isBlacklistedClient(supabase, c.studio_id, c.client_email, c.client_phone)) {
    return { error: "This client is blacklisted at this studio and cannot be booked." };
  }

  // Ownership check — data.artistId is caller-supplied; see the identical
  // comment in startConsultationDeposit() above for why this matters.
  const { data: artistRow } = await supabase
    .from("artists")
    .select("name, monthly_booking_cap")
    .eq("id", data.artistId)
    .eq("studio_id", callerStudioId)
    .maybeSingle();
  if (!artistRow) return { error: "Artist not found." };
  const artistForCap = artistRow as { name: string; monthly_booking_cap: number };
  if (await isAtMonthlyCap(supabase, data.artistId, artistForCap.monthly_booking_cap, data.date)) {
    return { error: `${artistForCap.name} is already at capacity for that month — choose a different date.` };
  }

  const clientId = await findOrCreateClient(supabase, c.studio_id, c.client_name, c.client_email, c.client_phone);
  if (!clientId) return { error: "Failed to create client record." };

  // final_price on the consultation is in dollars; quote_amount_cents on the
  // booking is in cents. Convert here so remainder collection has a reference.
  const quoteAmountCents = c.final_price ? c.final_price * 100 : null;
  const depositAmountCents = capDepositAmountCents(s.deposit_amount_cents, quoteAmountCents);
  const now = new Date().toISOString();

  const { data: booking, error: bookErr } = await supabase
    .from("bookings")
    .insert({
      studio_id:            c.studio_id,
      artist_id:            data.artistId,
      client_id:            clientId,
      date:                 data.date,
      time:                 data.time,
      style:                c.detected_style ?? "Custom",
      status:               "confirmed", // deposit already confirmed paid (gated above)
      deposit_amount_cents: depositAmountCents,
      deposit_paid:         true,
      deposit_paid_at:      now,
      ...(quoteAmountCents !== null ? { quote_amount_cents: quoteAmountCents } : {}),
    } as never)
    .select("id")
    .single();

  if (bookErr || !booking) return { error: "Failed to create booking." };
  const bookingId = (booking as { id: string }).id;

  await supabase
    .from("consultations")
    .update({ artist_id: data.artistId, booking_id: bookingId, status: "booked" } as never)
    .eq("id", consultId);

  return { bookingId };
}

