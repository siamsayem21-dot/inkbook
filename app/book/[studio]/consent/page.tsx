export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import StandaloneConsentForm from "@/components/booking/StandaloneConsentForm";

interface Props {
  params: { studio: string };
}

type StudioRow = { name: string; state: string | null };

export default async function ConsentPage({ params }: Props) {
  const supabase = createAdminClient();

  const { data: studioData } = await supabase
    .from("studios")
    .select("name, state")
    .eq("subdomain", params.studio)
    .single();

  const studio = studioData as StudioRow | null;
  if (!studio) notFound();

  return (
    <div className="max-w-lg mx-auto px-5 py-10">
      {/* Header */}
      <div className="mb-8">
        <p className="text-white/30 text-xs uppercase tracking-widest mb-1">
          {studio.name}
        </p>
        <h1 className="text-2xl font-bold mb-1">Tattoo consent form</h1>
        <p className="text-white/40 text-sm">
          Please complete this form before your appointment. All fields are required.
        </p>
      </div>

      <StandaloneConsentForm
        studioSlug={params.studio}
        studioName={studio.name}
      />
    </div>
  );
}
