export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import ArtistCard from "@/components/booking/ArtistCard";
import FlashSection, { type FlashCard } from "@/components/booking/FlashSection";

interface Props {
  params: { studio: string };
}

type StudioRow = {
  id: string;
  name: string;
  address: string | null;
  state: string | null;
  primary_color: string | null;
  font_choice: string | null;
};

type ArtistRow = {
  id: string;
  name: string;
  bio: string | null;
  styles: string[];
  minimum_rate_cents: number;
  avatar_url: string | null;
};

type FlashRow = {
  id: string;
  artist_id: string;
  title: string;
  image_url: string;
  price: number;
  category: string | null;
  is_repeatable: boolean;
};

function getBrand(hex: string) {
  const h = hex.replace("#", "").padEnd(6, "0").slice(0, 6);
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return {
    full: hex,
    subtle: `rgba(${r},${g},${b},0.25)`,
    medium: `rgba(${r},${g},${b},0.8)`,
    textOnBrand: luminance > 0.5 ? "#000000" : "#ffffff",
  };
}

export default async function StudioLandingPage({ params }: Props) {
  const supabase = createAdminClient();

  const { data: studioData } = await supabase
    .from("studios")
    .select("id, name, address, state, primary_color, font_choice")
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

  // Fetch available flash designs for this studio
  const { data: flashRaw } = await supabase
    .from("flash_designs")
    .select("id, artist_id, title, image_url, price, category, is_repeatable")
    .eq("studio_id", studio.id)
    .eq("is_available", true)
    .order("created_at", { ascending: false });

  const flashRows = (flashRaw ?? []) as FlashRow[];

  // Join artist names into flash cards
  const artistById = Object.fromEntries(artists.map((a) => [a.id, a.name]));
  const flashCards: FlashCard[] = flashRows.map((f) => ({
    ...f,
    artist_name: artistById[f.artist_id] ?? "Artist",
  }));

  const location = [studio.address, studio.state].filter(Boolean).join(", ");

  const brand = getBrand(studio.primary_color ?? "#D4AF37");
  const fontChoice = studio.font_choice ?? "default";
  const brandFont =
    fontChoice === "elegant"
      ? "var(--font-inter), system-ui, sans-serif"
      : "var(--font-cinzel), Georgia, serif";
  const fontWeight = fontChoice === "bold" ? "900" : undefined;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-16">

      {/* Studio hero — subtle tattoo background overlay */}
      <div className="mb-16 relative overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1568515045052-f9a854d70bfd?w=1600&q=80"
          alt=""
          fill
          className="object-cover object-top"
          unoptimized
          loading="lazy"
        />
        <div className="absolute inset-0 bg-ink/92 pointer-events-none" />
        <div className="relative z-10 py-10 px-2">
        <div
          className="inline-flex items-center gap-2.5 px-5 py-2.5 mb-7"
          style={{
            backgroundColor: `${brand.full}14`,
            border: `1px solid ${brand.full}40`,
          }}
        >
          <span
            className="w-2 h-2 rounded-full shrink-0 animate-pulse"
            style={{ backgroundColor: brand.full }}
          />
          <span className="label-xs font-bold" style={{ color: brand.full }}>
            Deposit Required to Book
          </span>
        </div>
        <h1
          className="text-5xl md:text-6xl font-black tracking-wide mb-3"
          style={{ fontFamily: brandFont, fontWeight: fontWeight ?? 900 }}
        >
          Book Your Appointment
        </h1>
        <p className="text-zinc-500 text-base">
          {location ? `${location} · ` : ""}Choose an artist to get started.
        </p>
        </div>
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

      {/* Flash designs section */}
      {flashCards.length > 0 && (
        <FlashSection
          studioSlug={params.studio}
          designs={flashCards}
          brandColor={brand.full}
          textOnBrand={brand.textOnBrand}
        />
      )}

      {/* Custom Request CTA */}
      <div
        className="mt-10 px-7 py-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 bg-zinc-900/70"
        style={{
          border: `1px solid ${brand.subtle}`,
          borderLeft: `3px solid ${brand.full}`,
        }}
      >
        <div>
          <p
            className="font-bold text-base tracking-wide mb-1"
            style={{ fontFamily: brandFont }}
          >
            Have a Custom Idea?
          </p>
          <p className="text-zinc-500 text-sm">
            Describe your vision and get a quote — no commitment until you pay a deposit.
          </p>
        </div>
        <Link
          href={`/book/${params.studio}/custom`}
          className="shrink-0 text-xs font-bold uppercase tracking-widest px-6 py-3 transition-all hover:opacity-90 hover:shadow-lg"
          style={{ backgroundColor: brand.full, color: brand.textOnBrand }}
        >
          Submit Custom Request
        </Link>
      </div>

      {/* AI Consultation CTA */}
      <div
        className="mt-4 px-7 py-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 bg-[#0d0d0d]"
        style={{
          border: `1px solid ${brand.subtle}`,
          borderLeft: `3px solid ${brand.full}`,
        }}
      >
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span
              className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{
                background: `${brand.full}18`,
                color: brand.full,
                border: `1px solid ${brand.full}30`,
              }}
            >
              AI Powered · 3 min
            </span>
          </div>
          <p className="font-bold text-base tracking-wide mb-1" style={{ fontFamily: brandFont }}>
            Not Sure Where to Start?
          </p>
          <p className="text-zinc-500 text-sm">
            Answer a few questions and our AI will analyze your vision, detect your style, and build a complete brief for the artist.
          </p>
        </div>
        <Link
          href={`/book/${params.studio}/consult`}
          className="shrink-0 text-xs font-bold uppercase tracking-widest px-6 py-3 border transition-all hover:opacity-90 whitespace-nowrap"
          style={{ borderColor: `${brand.full}50`, color: brand.full }}
        >
          Start AI Consultation →
        </Link>
      </div>

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
          <span className="label-xs text-zinc-700">Powered by InkBook</span>
        </div>
      </footer>
    </div>
  );
}
