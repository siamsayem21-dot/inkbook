"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/config";
import { revalidatePath } from "next/cache";

async function getOwnedArtistId(supabase: ReturnType<typeof createAdminClient>): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data } = await supabase.from("artists").select("id").eq("user_id", user.id).maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

// session_agreements has NO UPDATE/DELETE RLS policy anywhere ("Immutable
// after signing. Artist creates, owner and artist can read." — see the
// migration's own comment) — this is the only mutation this module ever
// performs. There is deliberately no editAgreement()/deleteAgreement().
export async function createSessionAgreement(data: {
  bookingId: string;
  designDescription: string;
  placement: string;
  agreedPriceDollars: number;
  sizeInches: string;
  clientSignature: string;
}): Promise<{ error?: string; id?: string }> {
  const supabase = createAdminClient();
  const artistId = await getOwnedArtistId(supabase);
  if (!artistId) return { error: "Unauthorized" };

  if (!data.designDescription.trim()) return { error: "Design description is required" };
  if (!data.placement.trim()) return { error: "Placement is required" };
  if (!data.clientSignature.trim()) return { error: "Client signature is required" };
  if (isNaN(data.agreedPriceDollars) || data.agreedPriceDollars <= 0) return { error: "Enter a valid agreed price" };

  // The booking must belong to this artist — an artist may only create an
  // agreement for their own session, never on behalf of a colleague's
  // booking, even at the same studio.
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, client_id, status")
    .eq("id", data.bookingId)
    .eq("artist_id", artistId)
    .maybeSingle();

  if (!booking) return { error: "Booking not found" };
  if (!["confirmed", "completed"].includes((booking as { status: string }).status)) {
    return { error: "An agreement can only be created for a confirmed or completed session" };
  }

  const { data: row, error } = await supabase
    .from("session_agreements")
    .insert({
      booking_id: data.bookingId,
      artist_id: artistId,
      client_id: (booking as { client_id: string }).client_id,
      design_description: data.designDescription.trim(),
      placement: data.placement.trim(),
      agreed_price_cents: Math.round(data.agreedPriceDollars * 100),
      size_inches: data.sizeInches.trim() || null,
      client_signature: data.clientSignature.trim(),
    } as never)
    .select("id")
    .single();

  if (error || !row) {
    // The unique constraint on booking_id is the expected failure mode when
    // an agreement already exists for this session — surface that plainly
    // rather than a generic DB error.
    if (error?.code === "23505") return { error: "This session already has an agreement on file." };
    console.error("[createSessionAgreement]", error?.message);
    return { error: "Failed to save the agreement — please try again" };
  }

  revalidatePath("/artist/agreements");
  return { id: (row as { id: string }).id };
}
