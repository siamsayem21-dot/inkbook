export const dynamic = "force-dynamic";

import Link from "next/link";
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-16">

      {/* Studio hero */}
      <div className="mb-16">
        <div className="inline-flex items-center gap-2.5 border border-gold/25 px-4 py-1.5 mb-7">
          <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
          <span className="label-xs text-gold/80">Deposit Required to Book</span>
        </div>
        <h1 className="font-cinzel text-4xl md:text-5xl font-bold tracking-wide mb-3">
          Book Your Appointment
        </h1>
        <p className="text-zinc-500 text-base">
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
        <div className="text-center py-20 border border-white/[0.08]">
          <p className="font-cinzel text-base font-semibold tracking-wide text-zinc-400 mb-1">No Artists Available Yet</p>
          <p className="text-zinc-600 text-sm">Check back soon.</p>
        </div>
      )}

      {/* Deposit notice */}
      <p className="label-xs text-zinc-700 text-center mt-14">
        A deposit is collected at booking and applied toward your session.
        It is non-refundable for no-shows or cancellations within 48 hours.
      </p>

      {/* Footer */}
      <div className="gold-divider mt-12" />
      <footer className="mt-8 text-center">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <Link href="/privacy" className="label-xs text-zinc-700 hover:text-zinc-500 transition-colors">
            Privacy Policy
          </Link>
          <span className="text-zinc-700" aria-hidden>·</span>
          <Link href="/terms" className="label-xs text-zinc-700 hover:text-zinc-500 transition-colors">
            Terms of Service
          </Link>
          <span className="text-zinc-700" aria-hidden>·</span>
          <span className="label-xs text-zinc-700">© 2026 InkBook</span>
        </div>
      </footer>
    </div>
  );
}
