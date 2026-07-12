import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "./client";

// Caps a deposit at the total quoted price so a booking's deposit never
// exceeds what the client actually owes (e.g. a $100 studio-default deposit
// against a $75 quote would leave a negative remainder). Falls back to the
// studio's flat default when no quote total is known. Shared by
// bookConsultation() (app/book/[studio]/consult/actions.ts, owner-driven) and
// continueToDeposit() (app/portal/[studio]/projects/[id]/actions.ts,
// client self-serve) — the same rule applies regardless of who initiates.
export function capDepositAmountCents(studioDefaultCents: number, quoteAmountCents: number | null): number {
  return quoteAmountCents !== null ? Math.min(studioDefaultCents, quoteAmountCents) : studioDefaultCents;
}

export type DepositCheckoutParams = {
  bookingId: string;
  depositAmountCents: number;
  artistId: string;
  artistName: string;
  studioName: string;
  clientEmail?: string | null;
  successUrl: string;
  cancelUrl: string;
  // Defaults to "deposit" so every pre-existing caller (both of them) keeps
  // working unchanged. Phase C Feature 2 passes "remainder" explicitly.
  paymentType?: "deposit" | "remainder";
};

export type DepositCheckoutResult = { checkoutUrl?: string; error?: string };

// Shared by the owner's "send deposit link" action and the client portal's
// self-serve "pay deposit" action — both authorize the caller against a
// booking in their own way, then hand the verified fields here. Reuses an
// open Stripe session for the same booking if one exists (handles
// double-clicks/repeat visits) before creating a new one.
export async function getOrCreateDepositCheckoutSession(
  params: DepositCheckoutParams
): Promise<DepositCheckoutResult> {
  const {
    bookingId, depositAmountCents, artistId, artistName, studioName, clientEmail, successUrl, cancelUrl,
    paymentType = "deposit",
  } = params;
  const supabase = createAdminClient();

  const { data: existingRows } = (await supabase
    .from("deposit_payments" as never)
    .select("id, stripe_checkout_session_id")
    .eq("booking_id", bookingId)
    .eq("payment_type", paymentType)
    .eq("payment_status", "pending")
    .not("stripe_checkout_session_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)) as { data: Array<{ id: string; stripe_checkout_session_id: string }> | null };

  let depositPaymentId: string | null = null;
  let stripe;
  try {
    stripe = getStripe();
  } catch {
    return { error: "Stripe is not configured. Add STRIPE_SECRET_KEY to your environment." };
  }

  if (existingRows && existingRows.length > 0) {
    const row = existingRows[0];
    depositPaymentId = row.id;

    try {
      const session = await stripe.checkout.sessions.retrieve(row.stripe_checkout_session_id);
      if (session.url && session.status === "open") {
        return { checkoutUrl: session.url };
      }
      await supabase
        .from("deposit_payments" as never)
        .update({ stripe_checkout_session_id: null } as never)
        .eq("id", row.id);
    } catch {
      // Stripe retrieval failed — fall through to create a new session
    }
  }

  if (!depositPaymentId) {
    const { data: pendingRows } = (await supabase
      .from("deposit_payments" as never)
      .select("id")
      .eq("booking_id", bookingId)
      .eq("payment_type", paymentType)
      .eq("payment_status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)) as { data: Array<{ id: string }> | null };

    if (pendingRows && pendingRows.length > 0) {
      depositPaymentId = pendingRows[0].id;
    } else {
      const { data: inserted, error: insertError } = (await supabase
        .from("deposit_payments" as never)
        .insert({
          booking_id: bookingId,
          amount_cents: depositAmountCents,
          payment_status: "pending",
          payment_type: paymentType,
        } as never)
        .select("id")
        .single()) as { data: { id: string } | null; error: unknown };

      if (insertError || !inserted) {
        console.error("[getOrCreateDepositCheckoutSession] insert failed:", insertError);
        return { error: "Failed to create deposit payment record" };
      }
      depositPaymentId = inserted.id;
    }
  }

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      ...(clientEmail ? { customer_email: clientEmail } : {}),
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data:
              paymentType === "remainder"
                ? {
                    name: `Remaining balance — ${artistName}`,
                    description: `${studioName} · Balance due for your tattoo session`,
                  }
                : {
                    name: `Tattoo deposit — ${artistName}`,
                    description: `${studioName} · Non-refundable on no-show or late cancellation`,
                  },
            unit_amount: depositAmountCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        bookingId,
        depositPaymentId,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[getOrCreateDepositCheckoutSession] Stripe session creation failed:", msg);
    return { error: `Stripe error: ${msg}` };
  }

  const { error: updateError } = await supabase
    .from("deposit_payments" as never)
    .update({ stripe_checkout_session_id: session.id } as never)
    .eq("id", depositPaymentId);

  if (updateError) {
    console.error("[getOrCreateDepositCheckoutSession] failed to save session id:", updateError);
    // Still return the URL — the user can proceed, webhook will reconcile later
  }

  // artistId is not referenced beyond the caller's own URL-building, but kept
  // as an explicit param so both call sites pass consistent, verified booking fields.
  void artistId;

  return { checkoutUrl: session.url! };
}
