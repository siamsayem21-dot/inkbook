export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import CustomRequestForm from "./CustomRequestForm";

interface Props {
  params: { studio: string };
}

type ArtistRow = { id: string; name: string };

function getBrand(hex: string) {
  const h = (hex ?? "#D4AF37").replace("#", "").padEnd(6, "0").slice(0, 6);
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return { full: `#${h}`, textOnBrand: lum > 0.5 ? "#000000" : "#ffffff" };
}

export default async function CustomRequestPage({ params }: Props) {
  const supabase = createAdminClient();

  const { data: studioData } = await supabase
    .from("studios")
    .select("id, name, primary_color")
    .eq("subdomain", params.studio)
    .single();

  const studio = studioData as { id: string; name: string; primary_color: string | null } | null;
  if (!studio) notFound();

  const { data: artistsData } = await supabase
    .from("artists")
    .select("id, name")
    .eq("studio_id", studio.id)
    .eq("is_active" as never, true)
    .order("name");

  const artists = (artistsData ?? []) as ArtistRow[];
  const brand   = getBrand(studio.primary_color ?? "#D4AF37");

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8 md:py-14">
      <Link
        href={`/book/${params.studio}`}
        className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-8"
      >
        ← Back to {studio.name}
      </Link>

      <div className="mb-8">
        <div
          className="inline-flex items-center gap-2.5 px-4 py-1.5 mb-5"
          style={{ border: `1px solid ${brand.full}40` }}
        >
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: brand.full }} />
          <span className="text-[10px] uppercase tracking-widest" style={{ color: `${brand.full}cc` }}>
            Custom Request
          </span>
        </div>
        <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-wide mb-2">
          Tell Us Your Vision
        </h1>
        <p className="text-zinc-400 text-sm leading-relaxed max-w-lg">
          Fill out this form and the artist will review your idea, then confirm with a deposit
          amount. No charge until you accept.
        </p>
      </div>

      <CustomRequestForm
        studioSlug={params.studio}
        studioId={studio.id}
        studioName={studio.name}
        artists={artists}
        primaryColor={brand.full}
        textOnBrand={brand.textOnBrand}
      />
    </div>
  );
}
