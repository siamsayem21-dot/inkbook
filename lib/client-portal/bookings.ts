import { createAdminClient } from "@/lib/supabase/admin";

export type ClientBooking = {
  id: string;
  consultationId: string;
  title: string;
  artistName: string | null;
  style: string;
  status: string; // booking_status enum, read as a raw string (see project-stage.ts's own precedent)
  date: string | null; // nullable — no date/time yet while status === "awaiting_schedule"
  time: string | null;
  depositAmountCents: number;
  depositPaid: boolean;
  depositPaidAt: string | null;
  depositKept: boolean;
};

export type ClientBookingDetail = ClientBooking & {
  description: string | null;
  depositExpiresAt: string | null;
  totalAmountCents: number | null;
  hasConsentForm: boolean;
};

type BookingRow = {
  id: string;
  artist_id: string | null;
  date: string | null;
  time: string | null;
  style: string;
  description: string | null;
  status: string;
  deposit_amount_cents: number;
  deposit_paid: boolean;
  deposit_paid_at: string | null;
  deposit_kept: boolean;
  deposit_expires_at: string | null;
  total_amount_cents: number | null;
};

const BOOKING_COLUMNS =
  "id, artist_id, date, time, style, description, status, deposit_amount_cents, " +
  "deposit_paid, deposit_paid_at, deposit_kept, deposit_expires_at, total_amount_cents";

function deriveTitle(description: string, style: string | null): string {
  const base = (style ? `${style} Tattoo` : description) || "Tattoo Project";
  return base.length > 50 ? `${base.slice(0, 47).trimEnd()}…` : base;
}

async function fetchArtistNames(supabase: ReturnType<typeof createAdminClient>, artistIds: string[]) {
  const names = new Map<string, string>();
  if (artistIds.length === 0) return names;
  const { data } = await supabase.from("artists").select("id, name").in("id", artistIds);
  for (const a of (data ?? []) as { id: string; name: string }[]) names.set(a.id, a.name);
  return names;
}

function toClientBooking(
  b: BookingRow,
  consultation: { id: string; tattoo_description: string; detected_style: string | null },
  artistNames: Map<string, string>
): ClientBooking {
  return {
    id: b.id,
    consultationId: consultation.id,
    title: deriveTitle(consultation.tattoo_description, consultation.detected_style),
    artistName: b.artist_id ? artistNames.get(b.artist_id) ?? null : null,
    style: b.style,
    status: b.status,
    date: b.date,
    time: b.time,
    depositAmountCents: b.deposit_amount_cents,
    depositPaid: b.deposit_paid,
    depositPaidAt: b.deposit_paid_at,
    depositKept: b.deposit_kept,
  };
}

// "My Bookings" is scoped to bookings reachable via the same ai_chats ->
// consultations.booking_id chain lib/client-portal/projects.ts already uses
// for Projects — the only safe, existing path from an authenticated client to
// a bookings row (bookings/clients have no client_account_id column and no
// client-facing RLS policy). Bookings created outside the portal's AI
// consultation flow are not visible here — see the "My Bookings" plan's
// Context/§9 for why an email-match join was rejected as unsafe.
export async function getClientBookings(studioId: string, clientAccountId: string): Promise<ClientBooking[]> {
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

  const { data: consultRows } = await supabase
    .from("consultations")
    .select("id, booking_id, tattoo_description, detected_style")
    .in("id", consultationIds)
    .not("booking_id", "is", null);

  const consultations = (consultRows ?? []) as {
    id: string;
    booking_id: string;
    tattoo_description: string;
    detected_style: string | null;
  }[];
  if (consultations.length === 0) return [];

  const bookingIds = consultations.map((c) => c.booking_id);
  const { data: bookingRows } = await supabase.from("bookings").select(BOOKING_COLUMNS).in("id", bookingIds);
  const bookings = (bookingRows ?? []) as BookingRow[];

  const artistNames = await fetchArtistNames(
    supabase,
    Array.from(new Set(bookings.map((b) => b.artist_id).filter((id): id is string => Boolean(id))))
  );

  const consultByBookingId = new Map(consultations.map((c) => [c.booking_id, c]));

  return bookings.map((b) => toClientBooking(b, consultByBookingId.get(b.id)!, artistNames));
}

export async function getClientBookingDetail(
  studioId: string,
  clientAccountId: string,
  bookingId: string
): Promise<ClientBookingDetail | null> {
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
  if (consultationIds.length === 0) return null;

  // Ownership proof: a consultation that (a) belongs to one of this client's
  // submitted ai_chats AND (b) points at exactly this booking. Never trusts
  // bookingId on its own — same "prove linkage via join table" pattern as
  // getClientProjectDetail() in lib/client-portal/projects.ts.
  const { data: consultRow } = await supabase
    .from("consultations")
    .select("id, tattoo_description, detected_style")
    .in("id", consultationIds)
    .eq("booking_id", bookingId)
    .maybeSingle();

  const consult = consultRow as { id: string; tattoo_description: string; detected_style: string | null } | null;
  if (!consult) return null;

  const { data: bookingRow } = await supabase.from("bookings").select(BOOKING_COLUMNS).eq("id", bookingId).maybeSingle();
  const b = bookingRow as BookingRow | null;
  if (!b) return null;

  const [artistNames, consentResult] = await Promise.all([
    fetchArtistNames(supabase, b.artist_id ? [b.artist_id] : []),
    supabase.from("consent_forms").select("id").eq("booking_id", bookingId).maybeSingle(),
  ]);

  return {
    ...toClientBooking(b, consult, artistNames),
    description: b.description,
    depositExpiresAt: b.deposit_expires_at,
    totalAmountCents: b.total_amount_cents,
    hasConsentForm: Boolean(consentResult.data),
  };
}
