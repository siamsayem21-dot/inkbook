import { getOrCreateDepositCheckoutSession } from "@/lib/stripe/deposit-checkout";
import { sendRemainderRequestEmail } from "@/lib/email";
import { buildSmsMessage, trySendSms } from "@/lib/twilio/client";

// Single shared body for "generate/reuse a remainder checkout session and
// notify the client" — called from both the owner's manual
// requestRemainderPayment() action (app/(owner)/owner/bookings/[bookingId]/actions.ts)
// and the automated remainder-reminder pass in
// app/api/cron/payment-reminders/route.ts (Phase C Feature 3), so the two
// paths can never drift apart. Callers are responsible for their own
// eligibility checks (ownership, remainder_collected, balance > 0) —
// this function assumes it's already safe to charge balanceDueCents.
export type RemainderPaymentTarget = {
  bookingId: string;
  artistId: string;
  artistName: string;
  studioName: string;
  balanceDueCents: number;
  clientEmail: string | null | undefined;
  clientName: string | null | undefined;
  clientPhone: string | null | undefined;
};

export async function sendRemainderPaymentRequest(
  target: RemainderPaymentTarget
): Promise<{ checkoutUrl?: string; error?: string }> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const result = await getOrCreateDepositCheckoutSession({
    bookingId: target.bookingId,
    depositAmountCents: target.balanceDueCents,
    artistId: target.artistId,
    artistName: target.artistName,
    studioName: target.studioName,
    clientEmail: target.clientEmail,
    paymentType: "remainder",
    successUrl: `${baseUrl}/owner/bookings/${target.bookingId}?remainder=paid`,
    cancelUrl: `${baseUrl}/owner/bookings/${target.bookingId}?remainder=cancelled`,
  });

  if (result.error) return { error: result.error };

  if (target.clientEmail && result.checkoutUrl) {
    void sendRemainderRequestEmail({
      to: target.clientEmail,
      clientName: target.clientName ?? "there",
      studioName: target.studioName,
      artistName: target.artistName,
      balanceDueCents: target.balanceDueCents,
      checkoutUrl: result.checkoutUrl,
    });
  }
  if (target.clientPhone) {
    void trySendSms(target.clientPhone, buildSmsMessage("remainder_pending", target.studioName));
  }

  return { checkoutUrl: result.checkoutUrl };
}
