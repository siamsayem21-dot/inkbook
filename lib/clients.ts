import { createAdminClient } from "@/lib/supabase/admin";

// Find-or-create a studio-scoped `clients` row, keyed by email. Extracted
// from POST /api/bookings so the new POST /api/waitlist route (Phase C
// Feature 6) doesn't duplicate the same lookup — the similar-but-separate
// find-or-create blocks in continueToDeposit()/bookConsultation() are
// pre-existing and untouched, out of scope for this feature.
export async function findOrCreateClient(
  supabase: ReturnType<typeof createAdminClient>,
  studioId: string,
  data: { name: string; email: string; phone: string }
): Promise<{ clientId?: string; error?: string }> {
  const { data: existingClient } = await supabase
    .from("clients")
    .select("id")
    .eq("studio_id", studioId)
    .eq("email", data.email)
    .maybeSingle();

  if (existingClient) {
    return { clientId: (existingClient as { id: string }).id };
  }

  const { data: newClient, error } = await supabase
    .from("clients")
    .insert({
      studio_id: studioId,
      full_name: data.name,
      email: data.email,
      phone: data.phone,
    } as never)
    .select("id")
    .single();

  if (error || !newClient) {
    return { error: "Failed to create client record" };
  }

  return { clientId: (newClient as { id: string }).id };
}
