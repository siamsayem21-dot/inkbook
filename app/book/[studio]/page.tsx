export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import ArtistCard from "@/components/booking/ArtistCard";

interface Props {
  params: { studio: string };
}

type StudioRow = { id: string; name: string; address: string | null; state: string | null };
type ArtistRow = {
  id: string;
  name: string;
  bio: string | null;
  styles: string[];
  minimum_rate_cents: number;
  avatar_url: string | null;
};

export default async function StudioLandingPage({ params }: Props) {
  const supabase = createAdminClient();

  const { data: studioData } = await supabase
    .from("studios")
    .select("id, name, address, state")
    .eq("subdomain", params.studio)
    .single();

  const studio = studioData as StudioRow | null;
  if (!studio) notFound();

  const { data: artistsData } = await supabase
    .from("artists")
    .select("id, name, bio, styles, minimum_rate_cents, avatar_url")
    .eq("studio_id", studio.id)
    .eq("is_active" as never, true)
    .order("name");

  const artists = (artistsData ?? []) as ArtistRow[];

  const location = [studio.address, studio.state].filter(Boolean).join(", ");

  return (
    <div className="max-w-5xl mx-auto px-6 py-14">

      {/* Studio hero */}
      <div className="mb-14">
        <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 rounded-full px-4 py-1.5 text-xs text-gold mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-gold" />
          Deposit required to book
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
          Book your appointment
        </h1>
        <p className="text-white/50 text-lg">
          {location ? `${location} · ` : ""}Choose an artist to get started.
        </p>
      </div>

      {/* Artist grid */}
      {artists.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {artists.map((artist) => (
            <ArtistCard
              key={artist.id}
              studioSlug={params.studio}
              artistId={artist.id}
              name={artist.name}
              bio={artist.bio ?? undefined}
              styles={artist.styles}
              minRate={Math.round(artist.minimum_rate_cents / 100)}
              avatarUrl={artist.avatar_url ?? undefined}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border border-white/10 rounded-2xl">
          <p className="text-white/40 text-lg font-medium mb-1">No artists available yet.</p>
          <p className="text-white/25 text-sm">Check back soon.</p>
        </div>
      )}

      {/* Deposit notice */}
      <p className="text-center text-white/25 text-xs mt-12">
        A deposit is collected at booking and applied toward your session.
        It is non-refundable for no-shows or cancellations within 48 hours.
      </p>
    </div>
  );
}
