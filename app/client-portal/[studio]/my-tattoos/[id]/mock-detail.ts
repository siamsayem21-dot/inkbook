import { MOCK_CHAT_SEED } from "../../home/mock-data";
import type { ProjectDetailData, TranscriptMessage } from "./types";

const SEED_TRANSCRIPT: TranscriptMessage[] = MOCK_CHAT_SEED.map((m) => ({
  role: m.role,
  content: m.content,
  imageUrl: null,
  createdAt: m.time,
}));

// Detail-level mock data for the 4 demo tattoo projects used across My
// Tattoos and Home when a client has no real projects yet. "mock-lion-sleeve"
// intentionally mirrors home/mock-data.ts's MOCK_CURRENT_PROJECT numbers so
// the same demo project never contradicts itself between pages. The 3
// completed entries mirror my-tattoos/mock-data.ts's buildMockCompletedProjects.
export function getMockProjectDetail(id: string, studioName: string): ProjectDetailData | null {
  switch (id) {
    case "mock-lion-sleeve":
      return {
        id,
        title: "Lion Sleeve",
        statusLabel: "In Progress",
        style: "Black & Gray Realism",
        placement: "Full Sleeve",
        size: "Large (8–10 in)",
        colorPreference: "Black & Gray",
        // Assigned (not "Pending Assignment") — the pipeline banner already
        // marks the Artist step complete at currentStageIndex 3 ("Quote"),
        // so the Artist card and the top-level Artist field below must agree
        // an artist is on the project, or the two contradict each other.
        artist: {
          name: "Jamie Chen",
          avatarUrl: null,
          specialty: "Realism, Black & Gray",
          studioName,
          profileHref: null,
        },
        headlinePriceLabel: "$1,500",
        nextStepLabel: "Quote Review",
        currentStageLabel: "Quote",
        currentStageIndex: 3,
        // Consultation, Design & Size, Artist genuinely done; Quote is the
        // current stage (not yet accepted), so it's deliberately excluded.
        completedStageIndices: [0, 1, 2],
        lastUpdatedLabel: "May 24, 2025",
        consultation: {
          summary: "A detailed black and gray realism lion, wrapping the full sleeve from shoulder to forearm.",
          notes: "Wants strong contrast and dimensional shading, referencing wildlife photography.",
          referenceImages: ["/tattoo/tattoo__(2).png"],
          statusLabel: "Reviewed",
          transcript: SEED_TRANSCRIPT,
        },
        design: {
          imageUrl: "/tattoo/tattoo__(2).png",
          style: "Black & Gray Realism",
          placement: "Full Sleeve",
          size: "Large (8–10 in)",
          colorPreference: "Black & Gray",
          confirmed: true,
        },
        quote: {
          // AI estimate kept as secondary/reference info — the final number
          // the client actually reviews is the artist-approved quote below.
          estimatedPriceLabel: "$1,200 – $1,800",
          finalPriceLabel: "$1,500",
          estimatedSessions: 2,
          estimatedDuration: "6–8 hours total",
          artistNotes: "Quote approved by Jamie Chen based on full sleeve coverage with fine shading detail.",
          quoteDateLabel: "May 24, 2025",
          status: "awaiting_review",
          acceptedDateLabel: null,
        },
        deposit: null,
        appointment: null,
        consent: { signed: false, signedDateLabel: null, isCurrentAction: false, completeHref: null },
        aftercare: { available: false, sentLabel: null },
        review: { active: false, hasReview: false, rating: null, quote: null, leaveHref: null },
        primaryAction: { label: "Review Quote", kind: "anchor", href: "#quote" },
      };

    case "mock-biomech-back":
      return completedMock({
        id,
        title: "Biomech Back Piece",
        style: "Black & Gray Realism",
        placement: "Full Back",
        size: "Full Back Piece",
        colorPreference: "Black & Gray",
        artistName: "Jamie Chen",
        specialty: "Realism, Biomechanical",
        studioName,
        price: "$2,400",
        summary: "A full biomechanical back piece blending organic muscle tissue with mechanical gears and pistons.",
        notes: "Client wanted a design that flows naturally with existing shoulder tattoos.",
        image: "/tattoo/tattoo__(1).png",
        sessions: 3,
        duration: "12+ hours across sessions",
        quoteDate: "Feb 20, 2025",
        acceptedDate: "Feb 22, 2025",
        depositRequired: "$480",
        depositPaid: "$480 — Paid",
        remaining: "$1,920 — Paid at session",
        appointmentDate: "March 12, 2025",
        appointmentTime: "10:00 AM",
        duration2: "Full day session",
        rating: 5,
        reviewQuote: "Jamie completely transformed my back — the detail is incredible and healed beautifully.",
        lastUpdated: "March 12, 2025",
      });

    case "mock-glory-over-pain":
      return completedMock({
        id,
        title: "Glory Over Pain",
        style: "Traditional American",
        placement: "Chest & Torso",
        size: "Large Chest Piece",
        colorPreference: "Bold Color",
        artistName: "Marcus Lee",
        specialty: "Traditional, Bold Line",
        studioName,
        price: "$1,850",
        summary: "A traditional American chest piece featuring an eagle, banner text, and floral accents.",
        notes: "Client requested bold, saturated colors matching classic flash style.",
        image: "/tattoo/tattoo__(4).png",
        sessions: 2,
        duration: "8 hours",
        quoteDate: "Dec 10, 2024",
        acceptedDate: "Dec 12, 2024",
        depositRequired: "$370",
        depositPaid: "$370 — Paid",
        remaining: "$1,480 — Paid at session",
        appointmentDate: "January 8, 2025",
        appointmentTime: "1:00 PM",
        duration2: "Full day session",
        rating: 4,
        reviewQuote: "Marcus nailed the classic look I wanted. Great experience overall.",
        lastUpdated: "January 8, 2025",
      });

    case "mock-peony-dragon-sleeve":
      return completedMock({
        id,
        title: "Peony Dragon Sleeve",
        style: "Japanese Traditional",
        placement: "Full Sleeve",
        size: "Full Sleeve",
        colorPreference: "Black & Gray with Color Accents",
        artistName: "Jamie Chen",
        specialty: "Japanese Traditional, Color",
        studioName,
        price: "$3,200",
        summary: "A Japanese traditional sleeve featuring a dragon winding through peony blossoms.",
        notes: "Client wanted the dragon to flow from shoulder to wrist with peonies filling the negative space.",
        image: "/tattoo/tattoo__(7).png",
        sessions: 4,
        duration: "18+ hours across sessions",
        quoteDate: "Oct 5, 2024",
        acceptedDate: "Oct 8, 2024",
        depositRequired: "$640",
        depositPaid: "$640 — Paid",
        remaining: "$2,560 — Paid at session",
        appointmentDate: "November 30, 2024",
        appointmentTime: "9:00 AM",
        duration2: "Multi-session (4 sessions)",
        rating: 5,
        reviewQuote: "Absolutely stunning work. Jamie's attention to detail with the peonies is unmatched.",
        lastUpdated: "November 30, 2024",
      });

    default:
      return null;
  }
}

interface CompletedMockInput {
  id: string;
  title: string;
  style: string;
  placement: string;
  size: string;
  colorPreference: string;
  artistName: string;
  specialty: string;
  studioName: string;
  price: string;
  summary: string;
  notes: string;
  image: string;
  sessions: number;
  duration: string;
  quoteDate: string;
  acceptedDate: string;
  depositRequired: string;
  depositPaid: string;
  remaining: string;
  appointmentDate: string;
  appointmentTime: string;
  duration2: string;
  rating: number;
  reviewQuote: string;
  lastUpdated: string;
}

function completedMock(input: CompletedMockInput): ProjectDetailData {
  return {
    id: input.id,
    title: input.title,
    statusLabel: "Completed",
    style: input.style,
    placement: input.placement,
    size: input.size,
    colorPreference: input.colorPreference,
    artist: {
      name: input.artistName,
      avatarUrl: null,
      specialty: input.specialty,
      studioName: input.studioName,
      profileHref: null,
    },
    headlinePriceLabel: input.price,
    nextStepLabel: "—",
    currentStageLabel: "Review & Rating",
    currentStageIndex: 9,
    completedStageIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    lastUpdatedLabel: input.lastUpdated,
    consultation: {
      summary: input.summary,
      notes: input.notes,
      referenceImages: [input.image],
      statusLabel: "Completed",
      transcript: null,
    },
    design: {
      imageUrl: input.image,
      style: input.style,
      placement: input.placement,
      size: input.size,
      colorPreference: input.colorPreference,
      confirmed: true,
    },
    quote: {
      estimatedPriceLabel: null,
      finalPriceLabel: input.price,
      estimatedSessions: input.sessions,
      estimatedDuration: input.duration,
      artistNotes: null,
      quoteDateLabel: input.quoteDate,
      status: "accepted",
      acceptedDateLabel: input.acceptedDate,
    },
    deposit: {
      requiredLabel: input.depositRequired,
      paidLabel: input.depositPaid,
      remainingLabel: input.remaining,
      statusLabel: "Paid in Full",
      payHref: null,
    },
    appointment: {
      dateLabel: input.appointmentDate,
      timeLabel: input.appointmentTime,
      artistName: input.artistName,
      studioName: input.studioName,
      durationLabel: input.duration2,
      statusLabel: "Completed",
      viewHref: null,
    },
    consent: { signed: true, signedDateLabel: input.appointmentDate, isCurrentAction: false, completeHref: null },
    aftercare: { available: true, sentLabel: `Sent to your email on ${input.appointmentDate}` },
    review: { active: true, hasReview: true, rating: input.rating, quote: input.reviewQuote, leaveHref: null },
    primaryAction: { label: "Project Complete", kind: "none" },
  };
}
