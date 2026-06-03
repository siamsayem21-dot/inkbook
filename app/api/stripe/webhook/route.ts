import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSmsMessage, trySendSms } from "@/lib/twilio/client";
import { sendBookingConfirmationEmail } from "@/lib/email";

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

    // Send booking_confirmed SMS + email (non-blocking)
    const { data: bookingRow } = await supabase
      .from("bookings")
      .select("client_id, artist_id, studio_id, date, time, deposit_amount_cents")
      .eq("id", bookingId)
      .single();

    if (bookingRow) {
      const { client_id, artist_id, studio_id, date, time, deposit_amount_cents } = bookingRow as {
        client_id: string;
        artist_id: string;
        studio_id: string;
        date: string;
        time: string;
        deposit_amount_cents: number;
      };

      const [{ data: clientData }, { data: artistData }, { data: studioData }] = await Promise.all([
        supabase.from("clients").select("full_name, email, phone").eq("id", client_id).single(),
        supabase.from("artists").select("name").eq("id", artist_id).single(),
        supabase.from("studios").select("name, address").eq("id", studio_id).single(),
      ]);

      const client = clientData as { full_name: string; email: string; phone: string } | null;
      const artistName = (artistData as { name: string } | null)?.name ?? "your artist";
      const studioName = (studioData as { name: string; address: string | null } | null)?.name;
      const studioAddress = (studioData as { name: string; address: string | null } | null)?.address ?? null;

      if (client?.phone && studioName) {
        void trySendSms(client.phone, buildSmsMessage("booking_confirmed", studioName));
      }

      if (client?.email && studioName) {
        const formattedDate = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        });
        const formattedTime = time.slice(0, 5);

        void sendBookingConfirmationEmail({
          to: client.email,
          clientName: client.full_name,
          artistName,
          studioName,
          studioAddress,
          date: formattedDate,
          time: formattedTime,
          depositAmountCents: deposit_amount_cents,
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
