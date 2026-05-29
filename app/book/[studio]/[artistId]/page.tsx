export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import AvailabilityCalendar from "@/components/booking/AvailabilityCalendar";

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

  const minRate = Math.round(artist.minimum_rate_cents / 100);

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">

      {/* Back link */}
      <Link
        href={`/book/${params.studio}`}
        className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-10"
      >
        ← All artists
      </Link>

      {/* Artist header */}
      <div className="flex flex-col sm:flex-row items-start gap-6 mb-12">
        <div className="w-24 h-24 rounded-full bg-zinc-800 shrink-0 overflow-hidden ring-2 ring-gold/25">
          {artist.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={artist.avatar_url} alt={artist.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/30 text-3xl font-bold">
              {artist.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold mb-2">{artist.name}</h1>
          <p className="text-gold text-sm font-medium mb-3">From ${minRate}/hr</p>

          {artist.styles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {artist.styles.map((s) => (
                <span
                  key={s}
                  className="text-xs bg-gold/10 text-gold border border-gold/20 px-3 py-1 rounded-full"
                >
                  {s}
                </span>
              ))}
            </div>
          )}

          {artist.bio && (
            <p className="text-white/50 text-sm leading-relaxed max-w-lg">{artist.bio}</p>
          )}
        </div>

        <Link
          href={`/book/${params.studio}/${params.artistId}/book`}
          className="shrink-0 bg-gold text-black font-bold px-6 py-3 rounded-full hover:bg-gold-light transition-colors text-sm"
        >
          Book now →
        </Link>
      </div>

      {/* Availability */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-1">Availability</h2>
        <p className="text-white/40 text-sm mb-6">Select a date below, then book your slot.</p>
        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
          <AvailabilityCalendar />
        </div>
      </section>

      {/* Book CTA */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-900 border border-gold/20 rounded-2xl px-6 py-5">
        <div>
          <p className="font-semibold mb-0.5">Ready to book with {artist.name}?</p>
          <p className="text-white/40 text-sm">A deposit secures your slot — applied toward your session.</p>
        </div>
        <Link
          href={`/book/${params.studio}/${params.artistId}/book`}
          className="shrink-0 bg-gold text-black font-bold px-8 py-3.5 rounded-full hover:bg-gold-light transition-colors text-sm"
        >
          Book now →
        </Link>
      </div>
    </main>
  );
}
