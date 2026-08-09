// Realistic placeholder content for Home-page widgets that don't have a
// backing table/query yet (flash design bookmarks, activity feed) or that
// are shown as a demo when a client has no real projects yet. Swapped for
// real data source-by-source as each backend piece lands — see the comment
// at each call site in home/page.tsx for which fields are already real.

export type MockCurrentProject = {
  title: string;
  size: string;
  style: string;
  artistStatus: string;
  nextStep: string;
  priceRange: string;
  lastUpdated: string;
};

export const MOCK_CURRENT_PROJECT: MockCurrentProject = {
  title: "Lion Sleeve",
  size: "Full Sleeve",
  style: "Black & Gray Realism",
  artistStatus: "Pending Assignment",
  nextStep: "Quote Review",
  priceRange: "$1,200 – $1,800",
  lastUpdated: "May 24, 2025",
};

export const MOCK_PAST_TATTOOS_COUNT = 3;

export type MockChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  time: string;
};

export const MOCK_CHAT_SEED: MockChatMessage[] = [
  {
    id: "seed-1",
    role: "assistant",
    content: "Hi! I'm InkBook AI. I'll help you bring your tattoo idea to life. What style are you thinking about?",
    time: "10:32 AM",
  },
  {
    id: "seed-2",
    role: "user",
    content: "I'm thinking of a detailed lion, black and gray realism.",
    time: "10:33 AM",
  },
  {
    id: "seed-3",
    role: "assistant",
    content: "Great choice! Where on your body are you thinking of placing it? And what size are you considering?",
    time: "10:34 AM",
  },
];

// public/tattoo/ only has lifestyle/portfolio photography (people wearing
// tattoos, the tattooing process) — no standalone flash-sheet artwork exists
// anywhere in the repo. A "flash design" is a design a client picks off a
// menu, not a photo of someone's arm, so these render as illustrated
// flash-sheet-style cards (icon on parchment) instead of borrowing a photo
// that would misrepresent what's being sold. Swap `icon` for a real
// `imageUrl` per card once actual flash artwork is uploaded.
export type MockFlashDesign = {
  id: string;
  title: string;
  category: string;
  icon: "swords" | "flower" | "compass";
};

export const MOCK_FLASH_DESIGNS: MockFlashDesign[] = [
  { id: "flash-1", title: "Twin Blade", category: "Fine Line", icon: "swords" },
  { id: "flash-2", title: "Wild Rose", category: "Traditional", icon: "flower" },
  { id: "flash-3", title: "Sacred Compass", category: "Geometric", icon: "compass" },
];

export type MockActivity = {
  id: string;
  icon: "chat" | "info" | "clock";
  title: string;
  detail: string;
  timeAgo: string;
};

export const MOCK_RECENT_ACTIVITY: MockActivity[] = [
  { id: "act-1", icon: "chat", title: "AI Consultation Started", detail: "You started a new consultation", timeAgo: "2h ago" },
  { id: "act-2", icon: "info", title: "Information Submitted", detail: "You submitted your design brief and references", timeAgo: "1d ago" },
  { id: "act-3", icon: "clock", title: "Appointment Preference Saved", detail: "Preferred date: May 30, 2025", timeAgo: "2d ago" },
];
