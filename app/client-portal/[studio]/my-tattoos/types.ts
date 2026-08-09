// Shared card data shapes for My Tattoos — kept independent of where the data
// came from (real Supabase rows vs mock fallback) so ActiveProjectCard /
// CompletedProjectCard stay pure presentational components other pages can
// reuse later (e.g. a future Studio or Project Detail "related projects"
// section) without depending on this page's fetching logic.

export type ActiveTattooProject = {
  id: string;
  title: string;
  imageUrl: string | null;
  objectPosition?: string;
  statusLabel: string;
  style: string;
  placement: string;
  artistName: string; // "Pending Assignment" when unassigned
  currentStageLabel: string;
  nextStepLabel: string;
  priceLabel: string; // formatted range/amount, or "Pending Quote"
  appointmentLabel: string | null; // null when nothing is scheduled yet
  lastUpdatedLabel: string;
  continueHref: string;
};

export type CompletedTattooProject = {
  id: string;
  title: string;
  imageUrl: string | null;
  objectPosition?: string;
  artistName: string;
  style: string;
  completedDateLabel: string;
  priceLabel: string | null; // null when not available
  continueHref: string;
};
