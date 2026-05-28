export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import AvailabilityCalendar from "@/components/booking/AvailabilityCalendar";
import PortfolioGrid from "@/components/artist/PortfolioGrid";

interface Props {
  params: { studio: string; artistId: string };
}

type StudioRow = { id: string };
type ArtistRow = {
  id: string;
  name: string;
  bio: string | null;
  styles: string[];
  minimum_rate_cents: number;
  avatar_url: string | null;
};

export default async function ArtistProfilePage({ params }: Props) {
  const supabase = createAdminClient();

  const { data: studioData } = await supabase
    .from("studios")
    .select("id")
    .eq("subdomain", params.studio)
    .single();

  const studio = studioData as StudioRow | null;
  if (!studio) notFound();

  const { data: artistData } = await supabase
    .from("artists")
    .select("id, name, bio, styles, minimum_rate_cents, avatar_url")
    .eq("id", params.artistId)
    .eq("studio_id", studio.id)
    .single();

  const artist = artistData as ArtistRow | null;
  if (!artist) notFound();

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <Link
        href={`/book/${params.studio}`}
        className="text-sm text-zinc-400 hover:text-zinc-600 mb-8 inline-block"
      >
        ← All artists
      </Link>

      <div className="flex items-start gap-6 mb-10">
        <div className="w-20 h-20 rounded-full bg-zinc-200 shrink-0 overflow-hidden">
          {artist.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={artist.avatar_url} alt={artist.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-500 text-2xl font-bold">
              {artist.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex-1">
          <h1 className="text-2xl font-bold">{artist.name}</h1>
          {artist.styles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {artist.styles.map((s) => (
                <span key={s} className="text-xs bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded-full">
                  {s}
                </span>
              ))}
            </div>
          )}
          <p className="text-zinc-500 text-sm mt-2">From ${Math.round(artist.minimum_rate_cents / 100)}/hr</p>
          {artist.bio && (
            <p className="text-zinc-600 text-sm mt-3 max-w-lg leading-relaxed">{artist.bio}</p>
          )}
        </div>

        <Link
          href={`/book/${params.studio}/${params.artistId}/book`}
          className="shrink-0 bg-zinc-900 text-white px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-zinc-700 transition-colors"
        >
          Book now
        </Link>
      </div>

      <section className="mb-10">
        <h2 className="font-semibold mb-4">Portfolio</h2>
        <PortfolioGrid />
      </section>

      <section>
        <h2 className="font-semibold mb-4">Availability</h2>
        <AvailabilityCalendar />
      </section>
    </main>
  );
}
