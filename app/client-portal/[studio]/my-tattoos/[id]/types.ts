// Full data shape for one Tattoo Project Detail page. One id in → one fully
// self-contained object out — every field here is scoped to that single
// project's own consultation/artist/quote/booking/consent/review rows, never
// merged across projects. Real and mock builders (page.tsx / mock-detail.ts)
// both produce this exact shape so the section components never need to know
// which source they're rendering.

export type ArtistInfo = {
  name: string;
  avatarUrl: string | null;
  specialty: string;
  studioName: string;
  profileHref: string | null;
};

export type TranscriptMessage = {
  role: "user" | "assistant";
  content: string;
  imageUrl: string | null;
  createdAt: string;
};

export type ProjectDetailData = {
  id: string;
  title: string;
  statusLabel: string;
  style: string;
  placement: string;
  size: string;
  colorPreference: string;
  artist: ArtistInfo | null;
  headlinePriceLabel: string;
  nextStepLabel: string;
  currentStageLabel: string;
  currentStageIndex: number;
  // Which PipelineStepper stages are genuinely done — computed from this
  // project's own real per-stage signals (quote accepted, deposit paid,
  // consent signed, booking confirmed, etc.), never inferred by assuming
  // everything before currentStageIndex finished. See PipelineStepper's own
  // completedIndices prop doc for why that distinction matters.
  completedStageIndices: number[];
  lastUpdatedLabel: string;

  consultation: {
    summary: string;
    notes: string | null;
    referenceImages: string[];
    statusLabel: string;
    transcript: TranscriptMessage[] | null;
  };

  design: {
    imageUrl: string | null;
    style: string;
    placement: string;
    size: string;
    colorPreference: string;
    confirmed: boolean;
  };

  quote: {
    estimatedPriceLabel: string | null;
    finalPriceLabel: string | null;
    estimatedSessions: number | null;
    estimatedDuration: string | null;
    artistNotes: string | null;
    quoteDateLabel: string | null;
    status: "not_ready" | "awaiting_review" | "accepted";
    acceptedDateLabel: string | null;
  } | null;

  deposit: {
    requiredLabel: string;
    paidLabel: string | null;
    remainingLabel: string | null;
    statusLabel: string;
    payHref: string | null;
  } | null;

  appointment: {
    dateLabel: string | null;
    timeLabel: string | null;
    artistName: string | null;
    studioName: string;
    durationLabel: string | null;
    statusLabel: string;
    viewHref: string | null;
  } | null;

  consent: {
    signed: boolean;
    signedDateLabel: string | null;
    isCurrentAction: boolean;
    completeHref: string | null;
  };

  aftercare: {
    available: boolean;
    sentLabel: string | null;
  };

  review: {
    active: boolean;
    hasReview: boolean;
    rating: number | null;
    quote: string | null;
    leaveHref: string | null;
  };

  primaryAction: {
    label: string;
    // "link"/"anchor" navigate; "none" renders nothing (nothing to do right
    // now); "disabled" shows the label as a visibly inert pill — used for a
    // mock project's post-acceptance "Pay Deposit" state, where the CTA
    // should stay visually dominant (so the state change is obvious) but
    // there's no real checkout to send a demo project to.
    kind: "link" | "anchor" | "none" | "disabled";
    href?: string;
  };
};
