import Link from "next/link";
import { FileCheck2 } from "lucide-react";
import SectionCard from "./SectionCard";
import type { ProjectDetailData } from "../types";

interface Props {
  consent: ProjectDetailData["consent"];
}

export default function ConsentCard({ consent }: Props) {
  return (
    <SectionCard
      id="consent"
      icon={FileCheck2}
      title="Consent"
      muted={!consent.signed && !consent.isCurrentAction}
      badge={
        <span
          className={`text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${
            consent.signed ? "text-emerald-700 bg-emerald-50" : "text-zinc-500 bg-zinc-100"
          }`}
        >
          {consent.signed ? "Signed" : "Not Signed"}
        </span>
      }
    >
      {consent.signed ? (
        <p className="text-sm text-zinc-600">Consent form signed on {consent.signedDateLabel}.</p>
      ) : consent.isCurrentAction ? (
        <div>
          <p className="text-sm text-zinc-600 mb-4">Your consent form is required before your session can be confirmed.</p>
          {consent.completeHref && (
            <Link
              href={consent.completeHref}
              className="inline-flex items-center justify-center bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl px-5 py-3 transition-colors"
            >
              Complete Consent →
            </Link>
          )}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">Available once your deposit is paid.</p>
      )}
    </SectionCard>
  );
}
