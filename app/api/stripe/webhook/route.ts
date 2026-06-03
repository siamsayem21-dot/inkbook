import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSmsMessage, trySendSms } from "@/lib/twilio/client";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const customRequestId = session.metadata?.customRequestId;

    // Handle custom request deposit
    if (customRequestId) {
      const supabase = createAdminClient();
      await supabase
        .from("custom_requests")
        .update({
          status: "accepted",
          stripe_payment_intent_id: session.payment_intent as string,
        } as never)
        .eq("id", customRequestId);
      return NextResponse.json({ received: true });
    }

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

    // Send booking_confirmed SMS (non-blocking)
    const { data: bookingRow } = await supabase
      .from("bookings")
      .select("client_id, studio_id")
      .eq("id", bookingId)
      .single();

    if (bookingRow) {
      const { client_id, studio_id } = bookingRow as { client_id: string; studio_id: string };
      const [{ data: clientData }, { data: studioData }] = await Promise.all([
        supabase.from("clients").select("phone").eq("id", client_id).single(),
        supabase.from("studios").select("name").eq("id", studio_id).single(),
      ]);
      const phone = (clientData as { phone: string } | null)?.phone;
      const studioName = (studioData as { name: string } | null)?.name;
      if (phone && studioName) {
        void trySendSms(phone, buildSmsMessage("booking_confirmed", studioName));
      }
    }
  }

  return NextResponse.json({ received: true });
}
