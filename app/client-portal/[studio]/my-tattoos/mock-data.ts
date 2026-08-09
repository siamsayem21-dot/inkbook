import { MOCK_CURRENT_PROJECT } from "../home/mock-data";
import type { ActiveTattooProject, CompletedTattooProject } from "./types";

// The active mock project mirrors the Home page's Current Project card
// exactly (same title/style/price/etc, imported from home/mock-data.ts) so
// the same demo tattoo reads consistently across both pages rather than
// showing contradictory numbers for "the same" project.
export function buildMockActiveProjects(studioSlug: string): ActiveTattooProject[] {
  return [
    {
      id: "mock-lion-sleeve",
      title: MOCK_CURRENT_PROJECT.title,
      imageUrl: "/tattoo/tattoo__(2).png",
      objectPosition: "50% 30%",
      statusLabel: "In Progress",
      style: MOCK_CURRENT_PROJECT.style,
      placement: MOCK_CURRENT_PROJECT.size,
      artistName: MOCK_CURRENT_PROJECT.artistStatus,
      currentStageLabel: "Quote",
      nextStepLabel: MOCK_CURRENT_PROJECT.nextStep,
      priceLabel: MOCK_CURRENT_PROJECT.priceRange,
      appointmentLabel: null,
      lastUpdatedLabel: MOCK_CURRENT_PROJECT.lastUpdated,
      continueHref: `/client-portal/${studioSlug}/my-tattoos/mock-lion-sleeve`,
    },
  ];
}

export function buildMockCompletedProjects(studioSlug: string): CompletedTattooProject[] {
  return [
    {
      id: "mock-biomech-back",
      title: "Biomech Back Piece",
      imageUrl: "/tattoo/tattoo__(1).png",
      objectPosition: "50% 35%",
      artistName: "Jamie Chen",
      style: "Black & Gray Realism",
      completedDateLabel: "March 12, 2025",
      priceLabel: "$2,400",
      continueHref: `/client-portal/${studioSlug}/my-tattoos/mock-biomech-back`,
    },
    {
      id: "mock-glory-over-pain",
      title: "Glory Over Pain",
      imageUrl: "/tattoo/tattoo__(4).png",
      objectPosition: "50% 35%",
      artistName: "Marcus Lee",
      style: "Traditional American",
      completedDateLabel: "January 8, 2025",
      priceLabel: "$1,850",
      continueHref: `/client-portal/${studioSlug}/my-tattoos/mock-glory-over-pain`,
    },
    {
      id: "mock-peony-dragon-sleeve",
      title: "Peony Dragon Sleeve",
      imageUrl: "/tattoo/tattoo__(7).png",
      objectPosition: "65% 45%",
      artistName: "Jamie Chen",
      style: "Japanese Traditional",
      completedDateLabel: "November 30, 2024",
      priceLabel: "$3,200",
      continueHref: `/client-portal/${studioSlug}/my-tattoos/mock-peony-dragon-sleeve`,
    },
  ];
}
