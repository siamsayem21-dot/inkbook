import { createAdminClient } from "@/lib/supabase/admin";
import type { GatheredFields } from "./chat-engine";

// Converts a completed AI consultation chat into a normal row in the existing
// `consultations` table — the same table the guest wizard at
// /book/[studio]/consult writes to, and the same table the owner's
// /owner/consultations dashboard already reads from. No owner-side code
// needs to change for the studio to "immediately receive" this consultation.
export async function submitConsultationFromChat(params: {
  chatId: string;
  studioId: string;
  clientEmail: string;
  gathered: GatheredFields;
}): Promise<{ consultationId: string } | { error: string }> {
  const { chatId, studioId, clientEmail, gathered } = params;
  const supabase = createAdminClient();

  const { data: imageRows } = await supabase
    .from("ai_chat_messages")
    .select("image_url")
    .eq("chat_id", chatId)
    .not("image_url", "is", null)
    .order("created_at", { ascending: true });

  const referencePhotos = Array.from(
    new Set(((imageRows ?? []) as { image_url: string | null }[]).map((r) => r.image_url).filter((u): u is string => Boolean(u)))
  );

  const extraLabels = ["Preferred artist", "Preferred dates", "Medical conditions / allergies", "Additional notes"];
  const extraValues = [gathered.preferredArtist, gathered.preferredDates, gathered.medicalNotes, gathered.additionalNotes];
  const followupAnswers: Record<string, string> = {};
  extraValues.forEach((v, i) => { if (v?.trim()) followupAnswers[i] = v.trim(); });

  const aiNotes = [
    gathered.preferredArtist ? `Preferred artist: ${gathered.preferredArtist}.` : "No artist preference stated.",
    gathered.preferredDates ? `Preferred dates: ${gathered.preferredDates}.` : "No date preference stated.",
    gathered.medicalNotes ? `Medical/allergy notes: ${gathered.medicalNotes}.` : "No medical/allergy notes reported.",
    gathered.additionalNotes ? `Additional notes: ${gathered.additionalNotes}` : "",
  ].filter(Boolean).join(" ");

  const { data: row, error } = await supabase
    .from("consultations")
    .insert({
      studio_id:          studioId,
      client_name:        gathered.name ?? "",
      client_email:       clientEmail,
      client_phone:       gathered.phone ?? "",
      tattoo_description: gathered.description ?? "",
      placement:          gathered.placement ?? "",
      estimated_size:     gathered.size ?? "",
      color_preference:   gathered.color ?? "",
      budget_range:       gathered.budget ?? "",
      reference_photos:   referencePhotos,
      followup_questions: extraLabels,
      followup_answers:   followupAnswers,
      detected_style:      gathered.style ?? null,
      ai_notes:            aiNotes || null,
      status:              "new" as const,
    } as never)
    .select("id")
    .single();

  if (error || !row) {
    console.error("[submitConsultationFromChat]", error?.message);
    return { error: "Failed to submit your consultation — please try again." };
  }

  const consultationId = (row as { id: string }).id;

  await supabase
    .from("ai_chats")
    .update({ status: "submitted", consultation_id: consultationId } as never)
    .eq("id", chatId);

  return { consultationId };
}
