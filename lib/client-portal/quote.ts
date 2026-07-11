// Compatibility layer between the owner-side `consultations` quote columns
// (added in supabase/migrations/20260619000000_consultation_quotes.sql) and the
// client-facing shape the portal renders. Isolated here so the Projects Detail
// page never touches raw DB column names directly.
export type ClientQuote = {
  amountDollars: number | null;
  estimatedSessions: number | null;
  estimatedDuration: string | null;
  artistNotes: string | null;
  quoteCreatedAt: string;
  // Client's "Accept Quote" action — see consultations.quote_accepted_at,
  // added in supabase/migrations/20260711000001_quote_acceptance.sql. Null
  // until the client accepts. Deliberately separate from the owner-side
  // quote_status ('none'/'saved') column — see that migration's header for why.
  acceptedAt: string | null;
};

export type QuoteSourceRow = {
  final_price: number | null;
  final_sessions: number | null;
  ai_estimated_sessions: number | null;
  ai_estimated_hours: string | null;
  quote_notes: string | null;
  updated_at: string;
  quote_accepted_at: string | null;
};

// TODO(schema): `consultations` has no dedicated `quoted_at` timestamp. The owner's
// saveConsultationQuote() action (app/book/[studio]/consult/actions.ts) writes every
// quote field and flips status to "quoted" in the same UPDATE, so `updated_at` is an
// accurate stand-in for "quote created date" *at the moment the quote is saved* — it
// will silently drift forward if the row is touched again later for an unrelated
// reason (e.g. artist reassignment) without the quote itself changing. Add a real
// `quoted_at TIMESTAMPTZ` column (set only inside saveConsultationQuote) and read it
// directly here once that migration lands; this whole function can then be deleted.
export function toClientQuote(row: QuoteSourceRow): ClientQuote {
  return {
    amountDollars: row.final_price,
    // Prefer the owner's final session count; fall back to the AI's estimate if the
    // owner never overrode it.
    estimatedSessions: row.final_sessions ?? row.ai_estimated_sessions,
    estimatedDuration: row.ai_estimated_hours,
    artistNotes: row.quote_notes,
    quoteCreatedAt: row.updated_at,
    acceptedAt: row.quote_accepted_at,
  };
}
