import Link from "next/link";
import { CreditCard } from "lucide-react";
import SectionCard from "./SectionCard";
import type { ProjectDetailData } from "../types";

interface Props {
  deposit: ProjectDetailData["deposit"];
}

export default function DepositPaymentCard({ deposit }: Props) {
  if (!deposit) {
    return (
      <SectionCard id="deposit" icon={CreditCard} title="Deposit & Payment" muted>
        <p className="text-sm text-zinc-500">Available once you&apos;ve accepted your quote.</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard id="deposit" icon={CreditCard} title="Deposit & Payment">
      <div className="grid grid-cols-2 gap-x-6 gap-y-3.5">
        <div>
          <p className="text-xs text-zinc-400">Required Deposit</p>
          <p className="text-sm font-medium text-zinc-800 mt-0.5">{deposit.requiredLabel}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-400">Amount Paid</p>
          <p className="text-sm font-medium text-zinc-800 mt-0.5">{deposit.paidLabel ?? "Not yet paid"}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-400">Remaining Balance</p>
          <p className="text-sm font-medium text-zinc-800 mt-0.5">{deposit.remainingLabel ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-400">Status</p>
          <p className="text-sm font-medium text-zinc-800 mt-0.5">{deposit.statusLabel}</p>
        </div>
      </div>

      {deposit.payHref && (
        <div className="mt-4 pt-4 border-t border-zinc-100">
          <Link
            href={deposit.payHref}
            className="inline-flex items-center justify-center bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl px-5 py-3 transition-colors"
          >
            Pay Deposit →
          </Link>
        </div>
      )}
    </SectionCard>
  );
}
