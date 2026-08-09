export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureClientAccount } from "@/lib/auth/config";
import { getClientProjectDetail } from "@/lib/client-portal/projects";
import { getClientBookingDetail, type ClientBookingDetail } from "@/lib/client-portal/bookings";
import { getBookingStatusMeta } from "@/lib/client-portal/booking-status";
import { formatDate } from "@/lib/utils";
import { HOME_PIPELINE_STAGES } from "../../home/_components/PipelineStepper";
import { getMockProjectDetail } from "./mock-detail";
import type { ProjectDetailData, TranscriptMessage } from "./types";
import ProjectDetailView from "./_components/ProjectDetailView";

interface Props {
  params: { studio: string; id: string };
}

function fmtCents(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmt12h(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return `${(h! % 12) || 12}:${String(m).padStart(2, "0")} ${h! >= 12 ? "PM" : "AM"}`;
}

// Position + completion state for the 10-step visual pipeline banner
// (PipelineStepper, shared with the Home page — order: Consultation,
// Design & Size, Artist, Quote, Deposit, Booking, Consent, Appointment,
// Aftercare, Review & Rating). Each stage's "done" flag comes directly from
// this project's own real, independent signal — never inferred just because
// a stage's index is lower than the current one — so a later stage being
// reached never falsely implies an earlier, unrelated one also finished.
// currentIndex is the first stage whose real signal isn't true yet (the
// thing actually being worked on right now).
function derivePipelineState(input: {
  designConfirmed: boolean;
  artistAssigned: boolean;
  quoteAccepted: boolean;
  depositPaid: boolean;
  bookingConfirmed: boolean;
  consentSigned: boolean;
  sessionCompleted: boolean;
  hasReview: boolean;
}): { currentIndex: number; completedIndices: number[] } {
  const stageDone = [
    true, // Consultation — reaching this page at all means one was submitted
    input.designConfirmed,
    input.artistAssigned,
    input.quoteAccepted,
    input.depositPaid,
    input.bookingConfirmed,
    input.consentSigned,
    input.sessionCompleted, // Appointment — the session itself happened
    input.sessionCompleted, // Aftercare — sent immediately on completion
    input.hasReview,
  ];
  const firstIncomplete = stageDone.findIndex((done) => !done);
  const currentIndex = firstIncomplete === -1 ? stageDone.length - 1 : firstIncomplete;
  const completedIndices = stageDone.reduce<number[]>((acc, done, i) => (done ? [...acc, i] : acc), []);
  return { currentIndex, completedIndices };
}

// Reads this one project's real AI consultation transcript directly — same
// ai_chats -> ai_chat_messages ownership pattern already used by
// acceptQuote()/continueToDeposit() (app/portal/[studio]/projects/[id]/actions.ts)
// — rather than pulling it out of the broader getClientHistory() aggregate,
// so it stays a direct, obviously-correct read for this specific project.
async function fetchProjectTranscript(
  supabase: ReturnType<typeof createAdminClient>,
  studioId: string,
  clientAccountId: string,
  projectId: string
): Promise<TranscriptMessage[] | null> {
  const { data: chatRow } = await supabase
    .from("ai_chats")
    .select("id")
    .eq("studio_id", studioId)
    .eq("client_account_id", clientAccountId)
    .eq("status", "submitted")
    .eq("consultation_id", projectId)
    .maybeSingle();

  const chatId = (chatRow as { id: string } | null)?.id;
  if (!chatId) return null;

  const { data: rows } = await supabase
    .from("ai_chat_messages")
    .select("role, content, image_url, created_at")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  const messages = (rows ?? []) as { role: string; content: string; image_url: string | null; created_at: string }[];
  if (messages.length === 0) return null;

  return messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
    imageUrl: m.image_url,
    createdAt: m.created_at,
  }));
}

async function buildRealProjectDetail(
  studioId: string,
  studioSlug: string,
  studioName: string,
  clientAccountId: string,
  projectId: string
): Promise<ProjectDetailData | null> {
  const detail = await getClientProjectDetail(studioId, clientAccountId, projectId);
  if (!detail) return null;

  const supabase = createAdminClient();

  const { data: extraRow } = await supabase
    .from("consultations")
    .select(
      "reference_photos, detected_style, artist_id, ai_recommended_price_min, ai_recommended_price_max, " +
        "final_price, final_sessions, ai_estimated_sessions, ai_estimated_hours, quote_notes"
    )
    .eq("id", projectId)
    .maybeSingle();

  const extra = extraRow as {
    reference_photos: string[];
    detected_style: string | null;
    artist_id: string | null;
    ai_recommended_price_min: number | null;
    ai_recommended_price_max: number | null;
    final_price: number | null;
    final_sessions: number | null;
    ai_estimated_sessions: number | null;
    ai_estimated_hours: string | null;
    quote_notes: string | null;
  } | null;

  let artistInfo: ProjectDetailData["artist"] = null;
  if (extra?.artist_id) {
    const { data: artistRow } = await supabase
      .from("artists")
      .select("id, name, bio, styles, avatar_url")
      .eq("id", extra.artist_id)
      .maybeSingle();
    const a = artistRow as { id: string; name: string; bio: string | null; styles: string[]; avatar_url: string | null } | null;
    if (a) {
      artistInfo = {
        name: a.name,
        avatarUrl: a.avatar_url,
        specialty: a.styles.length > 0 ? a.styles.slice(0, 3).join(", ") : a.bio ?? "Tattoo Artist",
        studioName,
        profileHref: `/book/${studioSlug}/${a.id}`,
      };
    }
  }

  let booking: ClientBookingDetail | null = null;
  if (detail.bookingId) {
    booking = await getClientBookingDetail(studioId, clientAccountId, detail.bookingId);
  }

  let reviewRow: { rating: number; quote: string } | null = null;
  if (booking?.hasReview) {
    const { data } = await supabase.from("reviews").select("rating, quote").eq("booking_id", booking.id).maybeSingle();
    reviewRow = data as { rating: number; quote: string } | null;
  }

  let consentSignedAt: string | null = null;
  if (detail.hasConsentForm && detail.bookingId) {
    const { data } = await supabase.from("consent_forms").select("signed_at").eq("booking_id", detail.bookingId).maybeSingle();
    consentSignedAt = (data as { signed_at: string } | null)?.signed_at ?? null;
  }

  const estimatedPriceLabel =
    extra?.ai_recommended_price_min != null && extra?.ai_recommended_price_max != null
      ? `$${extra.ai_recommended_price_min.toLocaleString()} – $${extra.ai_recommended_price_max.toLocaleString()}`
      : null;
  const finalAmount = detail.quote?.amountDollars ?? extra?.final_price ?? null;
  const finalPriceLabel = finalAmount != null ? `$${finalAmount.toLocaleString()}` : null;
  const headlinePriceLabel = finalPriceLabel ?? estimatedPriceLabel ?? "Pending Quote";

  const quoteAccepted = Boolean(detail.stage.quoteAcceptedAt);
  const quoteStatus: "not_ready" | "awaiting_review" | "accepted" = quoteAccepted
    ? "accepted"
    : detail.status === "quoted"
      ? "awaiting_review"
      : "not_ready";

  const hasAnyQuoteSignal = estimatedPriceLabel !== null || finalPriceLabel !== null || quoteStatus !== "not_ready";

  const style = extra?.detected_style || detail.colorPreference || "Custom";
  const projectPath = `/portal/${studioSlug}/projects/${projectId}`;

  const depositPayHref = booking && !booking.depositPaid ? projectPath : null;
  const consentIsCurrentAction = Boolean(booking?.depositPaid) && !detail.hasConsentForm;
  const bookingStatusLabel = booking ? getBookingStatusMeta(booking.status).label : null;

  const { currentIndex: currentStageIndex, completedIndices: completedStageIndices } = derivePipelineState({
    designConfirmed: detail.status !== "new",
    artistAssigned: Boolean(artistInfo),
    quoteAccepted,
    depositPaid: Boolean(booking?.depositPaid),
    bookingConfirmed: Boolean(booking?.date),
    consentSigned: detail.hasConsentForm,
    sessionCompleted: booking?.status === "completed",
    hasReview: booking?.hasReview ?? false,
  });

  const transcript = await fetchProjectTranscript(supabase, studioId, clientAccountId, projectId);

  const primaryAction: ProjectDetailData["primaryAction"] = (() => {
    if (booking?.status === "completed") {
      return booking.hasReview
        ? { label: "Project Complete", kind: "none" }
        : { label: "Leave a Review", kind: "link", href: `/portal/${studioSlug}/bookings/${booking.id}/review` };
    }
    if (booking?.date) {
      return { label: "View Appointment", kind: "link", href: `/portal/${studioSlug}/bookings/${booking.id}` };
    }
    if (booking?.depositPaid && !detail.hasConsentForm) {
      return { label: "Complete Consent", kind: "link", href: `${projectPath}/consent` };
    }
    if (booking?.depositPaid) {
      return { label: "Awaiting Appointment Confirmation", kind: "none" };
    }
    if (quoteAccepted) {
      return { label: "Pay Deposit", kind: "link", href: projectPath };
    }
    if (quoteStatus === "awaiting_review") {
      return { label: "Review Quote", kind: "anchor", href: "#quote" };
    }
    return { label: "Awaiting Quote", kind: "none" };
  })();

  return {
    id: detail.id,
    title: detail.title,
    statusLabel: detail.status === "completed" || detail.status === "converted" ? "Completed" : detail.status === "lost" ? "Declined" : "In Progress",
    style,
    placement: detail.placement || "Not specified",
    size: detail.estimatedSize || "Not specified",
    colorPreference: detail.colorPreference || "Not specified",
    artist: artistInfo,
    headlinePriceLabel,
    nextStepLabel: primaryAction.label,
    currentStageLabel: HOME_PIPELINE_STAGES[currentStageIndex] ?? "Consultation",
    currentStageIndex,
    completedStageIndices,
    lastUpdatedLabel: formatDate(detail.updatedAt),
    consultation: {
      summary: detail.tattooDescription,
      notes: detail.budgetRange ? `Budget range: ${detail.budgetRange}` : null,
      referenceImages: extra?.reference_photos ?? [],
      statusLabel: detail.status === "new" ? "Submitted" : "Reviewed",
      transcript,
    },
    design: {
      imageUrl: extra?.reference_photos?.[0] ?? null,
      style,
      placement: detail.placement || "Not specified",
      size: detail.estimatedSize || "Not specified",
      colorPreference: detail.colorPreference || "Not specified",
      confirmed: detail.status !== "new",
    },
    quote: hasAnyQuoteSignal
      ? {
          estimatedPriceLabel,
          finalPriceLabel,
          estimatedSessions: extra?.final_sessions ?? extra?.ai_estimated_sessions ?? null,
          estimatedDuration: extra?.ai_estimated_hours ?? null,
          artistNotes: extra?.quote_notes ?? null,
          quoteDateLabel: formatDate(detail.updatedAt),
          status: quoteStatus,
          acceptedDateLabel: detail.stage.quoteAcceptedAt ? formatDate(detail.stage.quoteAcceptedAt) : null,
        }
      : null,
    // Once the quote is accepted, Deposit & Payment becomes an active,
    // in-progress section even before a `bookings` row exists — that row
    // isn't created until continueToDeposit() runs (from the "Pay Deposit"
    // handoff below), so the exact amount isn't known yet, but the section
    // itself must stop reading as "locked" the moment there's something to
    // do here.
    deposit: booking
      ? {
          requiredLabel: fmtCents(booking.depositAmountCents),
          paidLabel: booking.depositPaid ? `${fmtCents(booking.depositAmountCents)} — Paid` : null,
          remainingLabel: null,
          statusLabel: booking.depositPaid ? "Deposit Paid" : "Awaiting Deposit",
          payHref: depositPayHref,
        }
      : quoteAccepted
        ? {
            requiredLabel: "Calculated at checkout",
            paidLabel: null,
            remainingLabel: null,
            statusLabel: "Awaiting Deposit",
            payHref: projectPath,
          }
        : null,
    appointment: booking
      ? {
          dateLabel: booking.date ? formatDate(booking.date) : null,
          timeLabel: booking.time ? fmt12h(booking.time) : null,
          artistName: booking.artistName,
          studioName,
          durationLabel: null,
          statusLabel: bookingStatusLabel ?? "Pending",
          viewHref: `/portal/${studioSlug}/bookings/${booking.id}`,
        }
      : null,
    consent: {
      signed: detail.hasConsentForm,
      signedDateLabel: consentSignedAt ? formatDate(consentSignedAt) : null,
      isCurrentAction: consentIsCurrentAction,
      completeHref: `${projectPath}/consent`,
    },
    aftercare: {
      available: booking?.status === "completed",
      sentLabel: booking?.status === "completed" ? `Sent to your email${booking.completedAt ? ` on ${formatDate(booking.completedAt)}` : ""}` : null,
    },
    review: {
      active: booking?.status === "completed",
      hasReview: booking?.hasReview ?? false,
      rating: reviewRow?.rating ?? null,
      quote: reviewRow?.quote ?? null,
      leaveHref: booking ? `/portal/${studioSlug}/bookings/${booking.id}/review` : null,
    },
    primaryAction,
  };
}

export default async function TattooProjectDetailPage({ params }: Props) {
  const supabase = createAdminClient();
  const { data: studioData } = await supabase
    .from("studios")
    .select("id, name")
    .eq("subdomain", params.studio)
    .single();

  const studio = studioData as { id: string; name: string } | null;
  if (!studio) notFound();

  const account = await ensureClientAccount();
  if (!account) notFound();

  let project = await buildRealProjectDetail(studio.id, params.studio, studio.name, account.id, params.id);
  let isMock = false;
  if (!project) {
    project = getMockProjectDetail(params.id, studio.name);
    isMock = true;
  }
  if (!project) notFound();

  return <ProjectDetailView project={project} studioSlug={params.studio} isMock={isMock} />;
}
