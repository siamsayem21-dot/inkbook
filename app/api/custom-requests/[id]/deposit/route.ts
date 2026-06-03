import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const { studioSlug } = body as { studioSlug?: string };

  if (!studioSlug) {
    return NextResponse.json({ error: "Missing studioSlug" }, { status: 400 });
  }

  let stripe;
  try {
    stripe = getStripe();
  } catch {
    return NextResponse.json(
      { error: "Payment is not configured. Please contact the studio." },
      { status: 503 }
    );
  }

  const supabase = createAdminClient();

  const { data: reqData } = await supabase
    .from("custom_requests" as never)
    .select("id, studio_id, artist_id, client_name, client_email, deposit_amount, status, stripe_payment_intent_id")
    .eq("id", params.id)
    .single();

  if (!reqData) return NextResponse.json({ error: "Request not found" }, { status: 404 });

  const cr = reqData as {
    id: string;
    studio_id: string;
    artist_id: string | null;
    client_name: string;
    client_email: string;
    deposit_amount: number | null;
    status: string;
    stripe_payment_intent_id: string | null;
  };

  if (cr.status !== "quoted") {
    return NextResponse.json({ error: "This request does not have a pending quote" }, { status: 409 });
  }

  if (!cr.deposit_amount || cr.deposit_amount <= 0) {
    return NextResponse.json({ error: "No deposit amount set on this request" }, { status: 400 });
  }

  const [{ data: studioData }, { data: artistData }] = await Promise.all([
    supabase.from("studios").select("name").eq("id", cr.studio_id).single(),
    cr.artist_id
      ? supabase.from("artists").select("name").eq("id", cr.artist_id).single()
      : Promise.resolve({ data: null }),
  ]);

  const studioName = (studioData as { name: string } | null)?.name ?? "Studio";
  const artistName = (artistData as { name: string } | null)?.name ?? "Artist";

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const depositCents = Math.round(cr.deposit_amount * 100);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    customer_email: cr.client_email,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Custom Tattoo Deposit — ${artistName}`,
            description: `${studioName} · Non-refundable deposit to confirm your custom appointment`,
          },
          unit_amount: depositCents,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${baseUrl}/book/${studioSlug}/request/${params.id}?deposit=paid`,
    cancel_url: `${baseUrl}/book/${studioSlug}/request/${params.id}?deposit=cancelled`,
    metadata: { customRequestId: params.id, studioSlug },
  });

  return NextResponse.json({ url: session.url });
}
