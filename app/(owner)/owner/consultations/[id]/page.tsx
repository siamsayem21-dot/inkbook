export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioId } from "@/lib/auth/config";
import ConsultationDetail from "./ConsultationDetail";

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

export default async function ConsultationDetailPage({ params }: Props) {
  const studioId = await getStudioId();
  if (!studioId) redirect("/login");

  const supabase = createAdminClient();

  const { data } = await supabase
    .from("consultations")
    .select("*")
    .eq("id" as never, params.id)
    .eq("studio_id" as never, studioId)
    .maybeSingle();

  if (!data) notFound();
  const consult = data as ConsultRow;

  // Self-heal: if quote was saved but status was never advanced (e.g. data entered
  // directly in the DB dashboard), sync status → "quoted" now so the UI is correct.
  if (
    consult.quote_status === "saved" &&
    (consult.status === "new" || consult.status === "reviewed")
  ) {
    await supabase
      .from("consultations")
      .update({ status: "quoted" } as never)
      .eq("id" as never, params.id);
    consult.status = "quoted";
  }

  // If a booking is linked, fetch the deposit amount for the deposit panel
  let bookingDepositAmountCents: number | undefined;
  if (consult.booking_id) {
    const { data: bk } = await supabase
      .from("bookings")
      .select("deposit_amount_cents")
      .eq("id", consult.booking_id)
      .maybeSingle();
    bookingDepositAmountCents =
      (bk as { deposit_amount_cents: number } | null)?.deposit_amount_cents;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link
          href="/owner/consultations"
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          ← Consultations
        </Link>
      </div>

      <ConsultationDetail
        consult={consult}
        bookingDepositAmountCents={bookingDepositAmountCents}
      />
    </div>
  );
}
