export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import ConsultationDetail from "./ConsultationDetail";

interface Props {
  params: { id: string };
}

type ConsultRow = {
  id: string;
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
  created_at: string;
};

export default async function ConsultationDetailPage({ params }: Props) {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("consultations")
    .select("*")
    .eq("id" as never, params.id)
    .single();

  if (!data) notFound();
  const consult = data as ConsultRow;

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

      <ConsultationDetail consult={consult} />
    </div>
  );
}
