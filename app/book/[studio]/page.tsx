export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import ArtistCard from "@/components/booking/ArtistCard";

interface Props {
  params: { studio: string };
}

type StudioRow = { id: string; name: string };
type ArtistRow = { id: string; name: string; styles: string[]; minimum_rate_cents: number; avatar_url: string | null };

export default async function StudioLandingPage({ params }: Props) {
  const supabase = createAdminClient();

  const { data: studioData } = await supabase
    .from("studios")
    .select("id, name")
    .eq("subdomain", params.studio)
    .single();

  const studio = studioData as StudioRow | null;
  if (!studio) notFound();

  const { data: artistsData } = await supabase
    .from("artists")
    .select("id, name, styles, minimum_rate_cents, avatar_url")
    .eq("studio_id", studio.id)
    .order("name");

  const artists = (artistsData ?? []) as ArtistRow[];

  return (
    <section className="px-6 py-10 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-2">Book an appointment</h2>
      <p className="text-zinc-500 mb-8">Choose an artist to get started.</p>

      {artists.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {artists.map((artist) => (
            <ArtistCard
              key={artist.id}
              studioSlug={params.studio}
              artistId={artist.id}
              name={artist.name}
              styles={artist.styles}
              minRate={Math.round(artist.minimum_rate_cents / 100)}
              avatarUrl={artist.avatar_url ?? undefined}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-zinc-400">
          <p className="text-lg font-medium mb-1">No artists available yet.</p>
          <p className="text-sm">Check back soon.</p>
        </div>
      )}
    </section>
  );
}
