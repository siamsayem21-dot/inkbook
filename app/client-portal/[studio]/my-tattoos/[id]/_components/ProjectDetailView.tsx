"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { acceptQuote } from "@/app/portal/[studio]/projects/[id]/actions";
import PipelineStepper from "../../../home/_components/PipelineStepper";
import ProjectHeader from "./ProjectHeader";
import ConsultationCard from "./ConsultationCard";
import DesignSizeCard from "./DesignSizeCard";
import ArtistCard from "./ArtistCard";
import QuoteCard from "./QuoteCard";
import DepositPaymentCard from "./DepositPaymentCard";
import AppointmentCard from "./AppointmentCard";
import ConsentCard from "./ConsentCard";
import AftercareCard from "./AftercareCard";
import ReviewCard from "./ReviewCard";
import ProjectSummarySidebar from "./ProjectSummarySidebar";
import type { ProjectDetailData } from "../types";

interface Props {
  project: ProjectDetailData;
  studioSlug: string;
  isMock: boolean;
}

// Applies the Quote -> Deposit transition locally for demo/mock projects,
// which have no real consultations row to persist quote_accepted_at to.
// Mirrors exactly what a real acceptQuote() + router.refresh() surfaces once
// a real quote is accepted, so the two code paths produce the same shape of
// change: quote flips to Accepted, the header/pipeline/sidebar all move to
// the Deposit stage together, and Deposit & Payment unlocks from "not
// reached yet" to an active, in-progress section.
function applyMockQuoteAcceptance(project: ProjectDetailData): ProjectDetailData {
  if (!project.quote) return project;
  return {
    ...project,
    nextStepLabel: "Pay Deposit",
    currentStageLabel: "Deposit",
    currentStageIndex: 4,
    // Quote is now genuinely done too (it was accepted); Deposit becomes the
    // current stage, not yet complete.
    completedStageIndices: Array.from(new Set([...project.completedStageIndices, 3])),
    quote: { ...project.quote, status: "accepted", acceptedDateLabel: "Just now" },
    deposit: {
      requiredLabel: "$300",
      paidLabel: null,
      remainingLabel: null,
      statusLabel: "Awaiting Deposit",
      payHref: null,
    },
    // Kept visible (not "none") so the state change reads clearly, but not a
    // real link — there's no live checkout for a project that doesn't exist
    // in the database.
    primaryAction: { label: "Pay Deposit", kind: "disabled" },
  };
}

export default function ProjectDetailView({ project, studioSlug, isMock }: Props) {
  const router = useRouter();
  const [current, setCurrent] = useState(project);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  // Stay in sync with fresh server data — e.g. after router.refresh() runs
  // below for a real (non-mock) project once acceptQuote() actually wrote
  // quote_accepted_at, or when navigating between different project ids.
  useEffect(() => {
    setCurrent(project);
  }, [project]);

  async function handleAcceptQuote() {
    setAcceptError(null);
    if (isMock) {
      setCurrent((prev) => applyMockQuoteAcceptance(prev));
      return;
    }
    setAccepting(true);
    const result = await acceptQuote(current.id);
    setAccepting(false);
    if (result.error) {
      setAcceptError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/client-portal/${studioSlug}/my-tattoos`}
        className="text-sm font-medium text-zinc-500 hover:text-zinc-800 transition-colors"
      >
        ← Back to My Tattoos
      </Link>

      <ProjectHeader project={current} />

      <PipelineStepper currentIndex={current.currentStageIndex} completedIndices={current.completedStageIndices} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
        <div className="space-y-5">
          <ConsultationCard consultation={current.consultation} />
          <DesignSizeCard design={current.design} />
          <ArtistCard artist={current.artist} />
          <QuoteCard quote={current.quote} onAcceptQuote={handleAcceptQuote} accepting={accepting} acceptError={acceptError} />
          <DepositPaymentCard deposit={current.deposit} />
          <AppointmentCard appointment={current.appointment} />
          <ConsentCard consent={current.consent} />
          <AftercareCard aftercare={current.aftercare} />
          <ReviewCard review={current.review} />
        </div>

        <ProjectSummarySidebar project={current} />
      </div>
    </div>
  );
}
