import { CreditCard } from "lucide-react";

// InkBook has no saved-payment-method infrastructure for clients — deposits
// go through one-off Stripe Checkout Sessions (lib/stripe/deposit-checkout.ts),
// never a stored customer/card. No "Manage Payment Methods" link is shown
// since no such flow exists to link to.
export default function PaymentSettingsCard() {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
      <div className="flex items-center gap-2.5 mb-5">
        <span className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
          <CreditCard size={16} />
        </span>
        <h2 className="text-base font-semibold text-zinc-900">Payment Settings</h2>
      </div>
      <p className="text-sm text-zinc-500">No saved payment method.</p>
      <p className="text-[11px] text-zinc-300 mt-2">
        Deposits and payments are handled securely through Stripe at checkout — your card details are never stored by InkBook.
      </p>
    </div>
  );
}
