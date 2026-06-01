"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function cancelBooking(bookingId: string): Promise<{ error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" } as never)
    .eq("id", bookingId);

  if (error) {
    console.error("[cancelBooking]", error.message);
    return { error: "Failed to cancel booking — please try again" };
  }

  revalidatePath("/owner/bookings");
  revalidatePath(`/owner/bookings/${bookingId}`);
  return {};
}
