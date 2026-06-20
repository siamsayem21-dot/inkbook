"use server";

import { createAdminClient } from "@/lib/supabase/admin";

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
  const supabase = createAdminClient();
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
      status:                   "quoted",
    } as never)
    .eq("id", id);

  if (error) return { error: error.message };
  return {};
}

export async function updateConsultationStatus(
  id: string,
  status: "new" | "reviewed" | "quoted" | "deposit_paid" | "booked" | "completed" | "lost" | "converted"
): Promise<{ error?: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("consultations")
    .update({ status } as never)
    .eq("id", id);

  if (error) return { error: error.message };
  return {};
}

