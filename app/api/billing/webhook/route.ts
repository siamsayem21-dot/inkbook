import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookingConfirmationEmail } from "@/lib/email";
import { buildSmsMessage, trySendSms } from "@/lib/twilio/client";

// Map Stripe price IDs to plan names — read from env so live/test IDs require no code change
function buildPriceMap(): Record<string, string> {
  const map: Record<string, string> = {};
  if (process.env.NEXT_PUBLIC_STRIPE_SOLO_PRICE_ID)   map[process.env.NEXT_PUBLIC_STRIPE_SOLO_PRICE_ID]   = "solo";
  if (process.env.NEXT_PUBLIC_STRIPE_STUDIO_PRICE_ID) map[process.env.NEXT_PUBLIC_STRIPE_STUDIO_PRICE_ID] = "studio";
  if (process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID)    map[process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID]    = "pro";
  return map;
}

function toLocalStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "canceled":
    case "cancelled":
      return "canceled";
    default:
      return "unpaid";
  }
}

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("[billing/webhook] Missing Stripe env vars");
    return Response.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return Response.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[billing/webhook] Signature verification failed:", err);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Use service-role client — webhook has no user session, so anon role / RLS would block updates
  const supabase = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = session.metadata?.bookingId;

      if (bookingId) {
        // Booking deposit payment — billing/webhook is the registered endpoint, handle it here
        const now = new Date().toISOString();
        await Promise.all([
          supabase
            .from("bookings")
            .update({ status: "confirmed", deposit_paid: true, deposit_paid_at: now } as never)
            .eq("id", bookingId),
          supabase
            .from("deposits")
            .update({ status: "paid", paid_at: now, stripe_payment_intent_id: session.payment_intent as string } as never)
            .eq("booking_id", bookingId),
        ]);

        const { data: bookingRow } = await supabase
          .from("bookings")
          .select("client_id, artist_id, studio_id, date, time, deposit_amount_cents")
          .eq("id", bookingId)
          .single();

        console.log("[webhook] bookingRow fetch:", bookingRow ? "found" : "null — email will not send");

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

          console.log("[email] API key present:", !!process.env.RESEND_API_KEY);
          console.log("[email] client email:", client?.email ?? "null — skipping email");

          if (client?.email && studioName) {
            const formattedDate = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            });
            const formattedTime = time.slice(0, 5);

            console.log("[email] attempting send to:", client.email);
            try {
              await sendBookingConfirmationEmail({
                to: client.email,
                clientName: client.full_name,
                artistName,
                studioName,
                studioAddress,
                date: formattedDate,
                time: formattedTime,
                depositAmountCents: deposit_amount_cents,
              });
              console.log("[email] result: success");
            } catch (err) {
              const castErr = err instanceof Error ? err : new Error(String(err));
              console.error("[email] error:", castErr.message);
            }
          }
        }
        break;
      }

      // Studio subscription payment — userId must be a valid UUID
      const userId = session.metadata?.userId;
      if (!userId) {
        console.warn("[billing/webhook] checkout.session.completed: no userId in metadata — skipping");
        break;
      }

      const { error } = await supabase
        .from("studios")
        .update({
          subscription_status: "active",
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          plan: session.metadata?.planId ?? "solo",
        } as never)
        .eq("owner_id", userId);

      if (error) {
        console.error("[billing/webhook] checkout.session.completed update failed:", error.message);
      }
      break;
    }

    case "customer.subscription.created": {
      const sub = event.data.object as Stripe.Subscription;
      const priceId = sub.items.data[0]?.price.id ?? "";
      const priceMap = buildPriceMap();
      const { error } = await supabase
        .from("studios")
        .update({
          subscription_status: toLocalStatus(sub.status),
          stripe_subscription_id: sub.id,
          plan: priceMap[priceId] ?? "solo",
        } as never)
        .eq("stripe_customer_id", sub.customer as string);

      if (error) {
        console.error("[billing/webhook] subscription.created update failed:", error.message);
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const priceId = sub.items.data[0]?.price.id ?? "";
      const priceMap = buildPriceMap();
      const { error } = await supabase
        .from("studios")
        .update({
          subscription_status: toLocalStatus(sub.status),
          plan: priceMap[priceId] ?? "solo",
        } as never)
        .eq("stripe_customer_id", sub.customer as string);

      if (error) {
        console.error("[billing/webhook] subscription.updated update failed:", error.message);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const { error } = await supabase
        .from("studios")
        .update({ subscription_status: "canceled" } as never)
        .eq("stripe_customer_id", sub.customer as string);

      if (error) {
        console.error("[billing/webhook] subscription.deleted update failed:", error.message);
      }
      break;
    }

    default:
      // Unhandled event type — acknowledged but ignored
      break;
  }

  return Response.json({ received: true });
}
