import Link from "next/link";
import { PAYMENT_SETUP_REQUIRED_ERROR } from "@/lib/stripe/connect";

// Renders a real, actionable "connect Stripe" link when a deposit/remainder
// action fails with PAYMENT_SETUP_REQUIRED_ERROR — the studio owner is the
// one person who can actually resolve this, unlike a client hitting the
// same error on the equivalent self-serve path (see
// lib/stripe/connect.ts's clientFacingPaymentError for that side). Any
// other error string renders as plain text, unchanged.
export default function PaymentSetupNotice({
  message,
  className = "text-sm text-red-600",
}: {
  message: string;
  className?: string;
}) {
  if (message === PAYMENT_SETUP_REQUIRED_ERROR) {
    return (
      <p className={className}>
        This studio hasn&apos;t connected Stripe yet.{" "}
        <Link href="/owner/settings/billing" className="underline font-semibold hover:text-red-700">
          Connect Stripe in Settings →
        </Link>
      </p>
    );
  }
  return <p className={className}>{message}</p>;
}
