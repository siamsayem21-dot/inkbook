import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const bookingId = session.metadata?.bookingId;

    if (!bookingId) {
      console.error("checkout.session.completed missing bookingId in metadata", session.id);
      return NextResponse.json({ error: "No bookingId in metadata" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const now = new Date().toISOString();

    await Promise.all([
      supabase
        .from("bookings")
        .update({
          status: "confirmed",
          deposit_paid: true,
          deposit_paid_at: now,
        } as never)
        .eq("id", bookingId),

      supabase
        .from("deposits")
        .update({
          status: "paid",
          paid_at: now,
          stripe_payment_intent_id: session.payment_intent as string,
        } as never)
        .eq("booking_id", bookingId),
    ]);
  }

  return NextResponse.json({ received: true });
}
