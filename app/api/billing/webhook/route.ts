import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

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
      const { error } = await supabase
        .from("studios")
        .update({
          subscription_status: "active",
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          plan: session.metadata?.planId ?? "solo",
        } as never)
        .eq("owner_id", session.metadata?.userId ?? "");

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
