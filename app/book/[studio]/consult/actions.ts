"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioId } from "@/lib/auth/config";

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

  let followupQuestions: string[] = [];
  let followupAnswers: Record<string, string> = {};
  try { followupQuestions = JSON.parse(questionsRaw ?? "[]"); } catch {}
  try { followupAnswers   = JSON.parse(answersRaw   ?? "{}"); } catch {}

  const supabase = createAdminClient();

  // Upload reference photos
  const photoUrls: string[] = [];
  for (const file of photoFiles) {
    if (!file || file.size === 0) continue;
    if (file.size > 8 * 1024 * 1024) continue;
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
  const canAdvanceToQuoted = ["new", "reviewed"].includes(currentStatus);

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
  const { error } = await supabase
    .from("consultations")
    .update({ status } as never)
    .eq("id", id)
    .eq("studio_id" as never, callerStudioId);

  if (error) return { error: error.message };
  return {};
}

// Converts a consultation into a real booking + client record.
// Called from the ConsultationDetail "Book Appointment" form.
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
  const c = consult as {
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

  // Idempotency guard — booking already exists for this consultation.
  // Return the existing booking ID instead of creating a duplicate.
  if (c.booking_id) return { bookingId: c.booking_id };

  const { data: studio } = await supabase
    .from("studios")
    .select("id, deposit_amount_cents")
    .eq("id", c.studio_id)
    .maybeSingle();

  if (!studio) return { error: "Studio not found." };
  const s = studio as { id: string; deposit_amount_cents: number };

  // Find or create client record
  const { data: existingClient } = await supabase
    .from("clients")
    .select("id")
    .eq("studio_id", c.studio_id)
    .eq("email", c.client_email)
    .maybeSingle();

  let clientId: string;
  if (existingClient) {
    clientId = (existingClient as { id: string }).id;
  } else {
    const { data: newClient, error: clientErr } = await supabase
      .from("clients")
      .insert({
        studio_id: c.studio_id,
        full_name:  c.client_name,
        email:      c.client_email,
        phone:      c.client_phone,
      } as never)
      .select("id")
      .single();
    if (clientErr || !newClient) return { error: "Failed to create client record." };
    clientId = (newClient as { id: string }).id;
  }

  // Create booking
  // final_price on the consultation is in dollars; quote_amount_cents on the
  // booking is in cents. Convert here so remainder collection has a reference.
  const quoteAmountCents = c.final_price ? c.final_price * 100 : null;

  // Deposit must not exceed the total quoted price — e.g. a $100 studio default
  // deposit on a $75 quote would make the remainder negative. Cap at the quote
  // total; fall back to the studio default when no quote has been saved.
  const depositAmountCents = quoteAmountCents !== null
    ? Math.min(s.deposit_amount_cents, quoteAmountCents)
    : s.deposit_amount_cents;

  const { data: booking, error: bookErr } = await supabase
    .from("bookings")
    .insert({
      studio_id:            c.studio_id,
      artist_id:            data.artistId,
      client_id:            clientId,
      date:                 data.date,
      time:                 data.time,
      style:                c.detected_style ?? "Custom",
      status:               "pending_deposit",
      deposit_amount_cents: depositAmountCents,
      deposit_paid:         false,
      ...(quoteAmountCents !== null ? { quote_amount_cents: quoteAmountCents } : {}),
    } as never)
    .select("id")
    .single();

  if (bookErr || !booking) return { error: "Failed to create booking." };
  const bookingId = (booking as { id: string }).id;

  // Link booking to consultation and advance status to "booked".
  // Status advances further to "deposit_paid" via Stripe webhook after client pays.
  await supabase
    .from("consultations")
    .update({
      artist_id:  data.artistId,
      booking_id: bookingId,
      status:     "booked",
    } as never)
    .eq("id", consultId);

  return { bookingId };
}

