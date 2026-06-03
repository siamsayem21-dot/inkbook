export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import CustomRequestForm from "./CustomRequestForm";

interface Props {
  params: { studio: string };
}

type ArtistRow = { id: string; name: string };

export default async function CustomRequestPage({ params }: Props) {
  const supabase = createAdminClient();

  const { data: studioData } = await supabase
    .from("studios")
    .select("id, name")
    .eq("subdomain", params.studio)
    .single();

  const studio = studioData as { id: string; name: string } | null;
  if (!studio) notFound();

  const { data: artistsData } = await supabase
    .from("artists")
    .select("id, name")
    .eq("studio_id", studio.id)
    .eq("is_active" as never, true)
    .order("name");

  const artists = (artistsData ?? []) as ArtistRow[];

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 md:py-14">

      {/* Back */}
      <Link
        href={`/book/${params.studio}`}
        className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-8"
      >
        ← Back to {studio.name}
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2.5 border border-gold/25 px-4 py-1.5 mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
          <span className="text-[10px] uppercase tracking-widest text-gold/80">Custom Request</span>
        </div>
        <h1 className="font-cinzel text-3xl md:text-4xl font-bold tracking-wide mb-2">
          Tell Us Your Vision
        </h1>
        <p className="text-zinc-400 text-sm leading-relaxed max-w-lg">
          Fill out this form and the artist will review your idea, then send you a custom quote.
          No commitment until you accept and pay a deposit.
        </p>
      </div>

      <CustomRequestForm
        studioSlug={params.studio}
        studioId={studio.id}
        artists={artists}
      />
    </div>
  );
}
