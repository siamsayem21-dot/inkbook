"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/config";
import { revalidatePath } from "next/cache";

export async function cancelBooking(bookingId: string): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const supabase = createAdminClient();

  const { data: studioRaw } = await supabase
    .from("studios")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1);

  const studioId = (studioRaw as { id: string }[] | null)?.[0]?.id;
  if (!studioId) return { error: "Studio not found" };

  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" } as never)
    .eq("id", bookingId)
    .eq("studio_id", studioId);

  if (error) {
    console.error("[cancelBooking]", error.message);
    return { error: "Failed to cancel booking — please try again" };
  }

  revalidatePath("/owner/bookings");
  revalidatePath(`/owner/bookings/${bookingId}`);
  return {};
}
