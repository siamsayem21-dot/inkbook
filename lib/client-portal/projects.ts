import { createAdminClient } from "@/lib/supabase/admin";
import { toClientQuote, type ClientQuote } from "./quote";
import { fetchBookingSignals, type ProjectStageInput } from "./project-stage";

export type ClientProject = {
  id: string;
  title: string;
  status: string;
  artistName: string | null;
  updatedAt: string;
};

export type ClientProjectDetail = ClientProject & {
  tattooDescription: string;
  placement: string;
  estimatedSize: string;
  colorPreference: string;
  budgetRange: string;
  createdAt: string;
  // Only populated when status === "quoted" — see requirement that the Quote
  // section must not render for any other status.
  quote: ClientQuote | null;
  // Populated regardless of current status — ProjectTimeline needs these to
  // derive its stage even once the project has moved past "quoted" (see
  // lib/client-portal/project-stage.ts). `quote.acceptedAt` above covers the
  // Quote section's own display; this covers the Timeline.
  stage: ProjectStageInput;
};

type ConsultationRow = {
  id: string;
  tattoo_description: string;
  detected_style: string | null;
  status: string;
  artist_id: string | null;
  updated_at: string;
};

function deriveTitle(description: string, style: string | null): string {
  const base = (style ? `${style} Tattoo` : description) || "Tattoo Consultation";
  return base.length > 60 ? `${base.slice(0, 57).trimEnd()}…` : base;
}

async function fetchArtistNames(supabase: ReturnType<typeof createAdminClient>, artistIds: string[]) {
  const names = new Map<string, string>();
  if (artistIds.length === 0) return names;
  const { data } = await supabase.from("artists").select("id, name").in("id", artistIds);
  for (const a of (data ?? []) as { id: string; name: string }[]) names.set(a.id, a.name);
  return names;
}

// "Projects" are `consultations` rows the client submitted from the portal's AI
// consultation chat. `consultations` has no client_account_id of its own — it's
// also written by the unauthenticated guest wizard at /book/[studio]/consult —
// so ownership is resolved via the submitted `ai_chats` row that links to it
// (see lib/ai-consultation/session.ts for the same pattern used on Dashboard).
export async function getClientProjects(
  studioId: string,
  clientAccountId: string
): Promise<ClientProject[]> {
  const supabase = createAdminClient();

  const { data: chatRows } = await supabase
    .from("ai_chats")
    .select("consultation_id")
    .eq("studio_id", studioId)
    .eq("client_account_id", clientAccountId)
    .eq("status", "submitted")
    .not("consultation_id", "is", null);

  const consultationIds = Array.from(
    new Set(
      ((chatRows ?? []) as { consultation_id: string | null }[])
        .map((r) => r.consultation_id)
        .filter((id): id is string => Boolean(id))
    )
  );
  if (consultationIds.length === 0) return [];

  const { data: rows } = await supabase
    .from("consultations")
    .select("id, tattoo_description, detected_style, status, artist_id, updated_at")
    .in("id", consultationIds)
    .order("updated_at", { ascending: false });

  const consultations = (rows ?? []) as ConsultationRow[];
  const artistNames = await fetchArtistNames(
    supabase,
    Array.from(new Set(consultations.map((c) => c.artist_id).filter((id): id is string => Boolean(id))))
  );

  return consultations.map((c) => ({
    id: c.id,
    title: deriveTitle(c.tattoo_description, c.detected_style),
    status: c.status,
    artistName: c.artist_id ? artistNames.get(c.artist_id) ?? null : null,
    updatedAt: c.updated_at,
  }));
}

export async function getClientProjectDetail(
  studioId: string,
  clientAccountId: string,
  projectId: string
): Promise<ClientProjectDetail | null> {
  const supabase = createAdminClient();

  // Ownership check — same reasoning as getClientProjects above.
  const { data: chat } = await supabase
    .from("ai_chats")
    .select("id")
    .eq("studio_id", studioId)
    .eq("client_account_id", clientAccountId)
    .eq("status", "submitted")
    .eq("consultation_id", projectId)
    .maybeSingle();
  if (!chat) return null;

  const { data: row } = await supabase
    .from("consultations")
    .select(
      "id, tattoo_description, placement, estimated_size, color_preference, budget_range, detected_style, " +
        "status, artist_id, created_at, updated_at, final_price, final_sessions, ai_estimated_sessions, " +
        "ai_estimated_hours, quote_notes, quote_accepted_at, booking_id"
    )
    .eq("id", projectId)
    .maybeSingle();
  if (!row) return null;

  const c = row as ConsultationRow & {
    placement: string;
    estimated_size: string;
    color_preference: string;
    budget_range: string;
    created_at: string;
    final_price: number | null;
    final_sessions: number | null;
    ai_estimated_sessions: number | null;
    ai_estimated_hours: string | null;
    quote_notes: string | null;
    quote_accepted_at: string | null;
    booking_id: string | null;
  };

  const artistNames = await fetchArtistNames(supabase, c.artist_id ? [c.artist_id] : []);
  const { depositPaidAt, bookingStatus } = await fetchBookingSignals(supabase, c.booking_id);

  return {
    id: c.id,
    title: deriveTitle(c.tattoo_description, c.detected_style),
    status: c.status,
    artistName: c.artist_id ? artistNames.get(c.artist_id) ?? null : null,
    updatedAt: c.updated_at,
    tattooDescription: c.tattoo_description,
    placement: c.placement,
    estimatedSize: c.estimated_size,
    colorPreference: c.color_preference,
    budgetRange: c.budget_range,
    createdAt: c.created_at,
    quote: c.status === "quoted" ? toClientQuote(c) : null,
    stage: {
      status: c.status,
      quoteAcceptedAt: c.quote_accepted_at,
      depositPaidAt,
      bookingStatus,
    },
  };
}
