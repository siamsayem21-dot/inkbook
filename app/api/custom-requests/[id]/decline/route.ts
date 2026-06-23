import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/config";
import { sendCustomRequestDeclinedEmail } from "@/lib/email";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { declined_reason } = body as { declined_reason?: string };

  const supabase = createAdminClient();

  const { data: reqData } = await supabase
    .from("custom_requests")
    .select("id, studio_id, client_name, client_email, status, booking_id")
    .eq("id", params.id)
    .single();

  if (!reqData) return NextResponse.json({ error: "Request not found" }, { status: 404 });

  const cr = reqData as {
    id: string;
    studio_id: string;
    client_name: string;
    client_email: string;
    status: string;
    booking_id: string | null;
  };

  // Allow declining pending, quoted, and accepted requests.
  // accepted = deposit already paid and booking exists — cancellation after payment
  // requires the studio to manually issue a refund via Stripe dashboard.
  if (!["pending", "quoted", "accepted"].includes(cr.status)) {
    return NextResponse.json({ error: "Request cannot be declined in its current state" }, { status: 409 });
  }

  // Verify this user belongs to the studio
  const [{ data: artistRow }, { data: studioRow }] = await Promise.all([
    supabase.from("artists").select("studio_id").eq("user_id", user.id).maybeSingle(),
    supabase.from("studios").select("id, name, subdomain").eq("owner_id", user.id).maybeSingle(),
  ]);

  const isArtist = (artistRow as { studio_id: string } | null)?.studio_id === cr.studio_id;
  const ownerStudio = studioRow as { id: string; name: string; subdomain: string } | null;
  const isOwner = ownerStudio?.id === cr.studio_id;

  if (!isArtist && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // If an accepted request has a linked booking (deposit was paid), cancel the booking.
  // deposit_kept remains false — the studio owes a refund to the client.
  // Refund must be issued manually via the Stripe dashboard using the
  // stripe_payment_intent_id stored on the custom_request.
  if (cr.status === "accepted" && cr.booking_id) {
    const { error: bookingCancelError } = await supabase
      .from("bookings")
      .update({ status: "cancelled" } as never)
      .eq("id", cr.booking_id)
      .eq("status", "awaiting_schedule"); // guard: only cancel if still unscheduled

    if (bookingCancelError) {
      console.error("[decline] booking cancel error:", bookingCancelError.message);
      return NextResponse.json({ error: "Failed to cancel linked booking" }, { status: 500 });
    }
  }

  const { error } = await supabase
    .from("custom_requests")
    .update({
      status:          "declined",
      declined_reason: declined_reason?.trim() || null,
    } as never)
    .eq("id", params.id);

  if (error) {
    console.error("[decline] update error:", error.message);
    return NextResponse.json({ error: "Failed to decline request" }, { status: 500 });
  }

  let studioName = ownerStudio?.name ?? "";
  let studioSlug = ownerStudio?.subdomain ?? "";
  if (!studioName || !studioSlug) {
    const { data: s } = await supabase
      .from("studios").select("name, subdomain").eq("id", cr.studio_id).single();
    if (s) {
      const row = s as { name: string; subdomain: string };
      studioName = row.name;
      studioSlug = row.subdomain;
    }
  }

  void sendCustomRequestDeclinedEmail({
    to:             cr.client_email,
    clientName:     cr.client_name,
    studioName,
    studioSlug,
    declinedReason: declined_reason?.trim(),
    depositWasPaid: cr.status === "accepted",
  });

  return NextResponse.json({ success: true });
}
