export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";
import ArtistConsultationDetail from "./ArtistConsultationDetail";

interface Props {
  params: { id: string };
}

type ConsultRow = {
  id: string;
  studio_id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  tattoo_description: string;
  placement: string;
  estimated_size: string;
  color_preference: string;
  budget_range: string;
  reference_photos: string[];
  followup_questions: string[];
  followup_answers: Record<number, string>;
  detected_style: string | null;
  style_confidence: number | null;
  style_reasoning: string | null;
  ai_notes: string | null;
  status: string;
  ai_recommended_price_min: number | null;
  ai_recommended_price_max: number | null;
  ai_estimated_sessions: number | null;
  ai_estimated_hours: string | null;
  ai_difficulty: string | null;
  ai_quote_reasoning: string | null;
  final_price: number | null;
  final_sessions: number | null;
  quote_notes: string | null;
  quote_status: string;
  artist_id: string | null;
  booking_id: string | null;
  created_at: string;
};

export default async function ArtistConsultationDetailPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();

  const { data: artistRaw } = await supabase
    .from("artists")
    .select("id, studio_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const artist = artistRaw as { id: string; studio_id: string } | null;
  if (!artist) redirect("/artist/dashboard");

  // Scoped to this artist's own studio AND (assigned to them OR unclaimed) —
  // a consultation assigned to a different artist must 404 here exactly like
  // a nonexistent one, so the response never leaks whether it exists.
  const { data } = await supabase
    .from("consultations")
    .select("*")
    .eq("id", params.id)
    .eq("studio_id", artist.studio_id)
    .or(`artist_id.eq.${artist.id},artist_id.is.null`)
    .maybeSingle();

  if (!data) notFound();
  const consult = data as ConsultRow;

  let bookingDepositAmountCents: number | undefined;
  let bookingSummary: { artistName: string; date: string | null; time: string | null } | null = null;
  if (consult.booking_id) {
    const { data: bk } = await supabase
      .from("bookings")
      .select("deposit_amount_cents, date, time, artist_id")
      .eq("id", consult.booking_id)
      .maybeSingle();
    const booking = bk as
      | { deposit_amount_cents: number; date: string | null; time: string | null; artist_id: string }
      | null;
    bookingDepositAmountCents = booking?.deposit_amount_cents;

    if (booking) {
      const { data: artistRow } = await supabase
        .from("artists")
        .select("name")
        .eq("id", booking.artist_id)
        .maybeSingle();
      bookingSummary = {
        artistName: (artistRow as { name: string } | null)?.name ?? "—",
        date: booking.date,
        time: booking.time,
      };
    }
  }

  return (
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-6 max-w-3xl">
        <Link
          href="/artist/consultations"
          className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          ← Consultations
        </Link>

        <ArtistConsultationDetail
          consult={consult}
          myArtistId={artist.id}
          bookingDepositAmountCents={bookingDepositAmountCents}
          bookingSummary={bookingSummary}
        />
      </div>
    </div>
  );
}
