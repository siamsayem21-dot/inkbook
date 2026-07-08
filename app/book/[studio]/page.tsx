export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBrand } from "@/lib/brand";
import { getPublicFaq, type KnowledgeEntry } from "@/lib/studio-knowledge";
import { getPublicReviews, getPortfolioImages } from "@/lib/studio-content";
import ArtistCard from "@/components/booking/ArtistCard";
import FlashSection, { type FlashCard } from "@/components/booking/FlashSection";
import PortfolioSection, { type PortfolioCard } from "@/components/booking/PortfolioSection";
import ReviewsSection from "@/components/booking/ReviewsSection";

interface Props {
  params: { studio: string };
}

type StudioRow = {
  id: string;
  name: string;
  address: string | null;
  state: string | null;
  about: string | null;
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

export default async function StudioLandingPage({ params }: Props) {
  const supabase = createAdminClient();

  const { data: studioData } = await supabase
    .from("studios")
    .select("id, name, address, state, about, primary_color, font_choice")
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
  const artistById = Object.fromEntries(artists.map((a) => [a.id, a.name]));

  const { data: flashRaw } = await supabase
    .from("flash_designs")
    .select("id, artist_id, title, image_url, price, category, is_repeatable")
    .eq("studio_id", studio.id)
    .eq("is_available", true)
    .order("created_at", { ascending: false });

  const flashRows = (flashRaw ?? []) as FlashRow[];
  const flashCards: FlashCard[] = flashRows.map((f) => ({
    ...f,
    artist_name: artistById[f.artist_id] ?? "Artist",
  }));

  const [faqEntries, reviews, portfolioRows] = await Promise.all([
    getPublicFaq(studio.id),
    getPublicReviews(studio.id),
    getPortfolioImages(studio.id),
  ]);

  const portfolioCards: PortfolioCard[] = portfolioRows.map((p) => ({
    ...p,
    artist_name: artistById[p.artist_id] ?? "Artist",
  }));

  const location = [studio.address, studio.state].filter(Boolean).join(", ");
  const uniqueStyles = Array.from(new Set(artists.flatMap((a) => a.styles))).length;

  const brand = getBrand(studio.primary_color ?? "#D4AF37");
  const fontChoice = studio.font_choice ?? "default";
  const brandFont =
    fontChoice === "elegant"
      ? "var(--font-sans), system-ui, sans-serif"
      : "var(--font-serif), Georgia, serif";
  const fontWeight = fontChoice === "bold" ? "700" : undefined;

  return (
    <div id="top" className="max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-20">

      {/* ── Hero ── */}
      <section className="mb-24 md:mb-28 max-w-3xl">
        <div
          className="inline-flex items-center gap-2.5 px-4 py-2 mb-8"
          style={{ backgroundColor: `${brand.full}14`, border: `1px solid ${brand.full}40` }}
        >
          <span className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: brand.full }} />
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: brand.full }}>
            Deposit required to book
          </span>
        </div>

        <h1
          className="text-5xl md:text-7xl tracking-tight mb-5 leading-[1.05]"
          style={{ fontFamily: brandFont, fontWeight: fontWeight ?? 700 }}
        >
          {studio.name}
        </h1>

        <p className="text-zinc-400 text-base md:text-lg leading-relaxed mb-9 max-w-xl">
          {studio.about
            ? studio.about
            : "Custom tattoo work, booked online. Choose an artist, describe your idea, and lock in your appointment with a secure deposit."}
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <Link
            href={`/book/${params.studio}/login`}
            className="text-sm font-bold uppercase tracking-widest px-7 py-3.5 transition-opacity hover:opacity-90"
            style={{ backgroundColor: brand.full, color: brand.textOnBrand }}
          >
            Start AI Consultation →
          </Link>
          <a
            href="#artists"
            className="text-sm font-semibold uppercase tracking-widest px-7 py-3.5 border border-white/15 text-zinc-300 hover:border-white/30 hover:text-white transition-colors"
          >
            Browse Artists
          </a>
        </div>

        <p className="text-zinc-600 text-xs mt-5">
          {location && <>{location} · </>}
          Have a fully-formed idea already?{" "}
          <Link href={`/book/${params.studio}/custom`} className="underline hover:text-zinc-400 transition-colors">
            Submit a custom request
          </Link>{" "}
          instead.
        </p>
      </section>

      {/* ── About Studio ── */}
      <section id="about" className="mb-20 md:mb-24 scroll-mt-24">
        <div className="grid md:grid-cols-3 gap-10 md:gap-16">
          <div className="md:col-span-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">About the Studio</p>
            <h2 className="font-serif text-2xl md:text-3xl tracking-wide mb-4">
              {studio.about ? "Our Story" : "A dedicated home for custom tattoo work"}
            </h2>
            <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-wrap">
              {studio.about ??
                `${studio.name} is committed to safe, professional tattoo work from consultation through aftercare. Every booking includes a written scope of work and a secure deposit, so there are no surprises for you or the artist on session day.`}
            </p>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-1 gap-6 md:gap-5 md:border-l md:border-white/[0.08] md:pl-10">
            <div>
              <p className="text-3xl font-serif" style={{ color: brand.full }}>{artists.length}</p>
              <p className="text-zinc-500 text-xs uppercase tracking-wide mt-1">
                Artist{artists.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div>
              <p className="text-3xl font-serif" style={{ color: brand.full }}>{uniqueStyles || "—"}</p>
              <p className="text-zinc-500 text-xs uppercase tracking-wide mt-1">Styles covered</p>
            </div>
            <div>
              <p className="text-3xl font-serif" style={{ color: brand.full }}>
                {reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "—"}
              </p>
              <p className="text-zinc-500 text-xs uppercase tracking-wide mt-1">Avg. rating</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Artist list ── */}
      <section id="artists" className="mb-20 md:mb-24 scroll-mt-24">
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">Meet the Team</p>
          <h2 className="font-serif text-2xl md:text-3xl tracking-wide">Our Artists</h2>
        </div>

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
            <p className="text-base font-semibold tracking-wide text-zinc-400 mb-1">No Artists Available Yet</p>
            <p className="text-zinc-600 text-sm">Check back soon.</p>
          </div>
        )}
      </section>

      {/* ── Portfolio gallery ── */}
      <PortfolioSection images={portfolioCards} />

      {/* ── Flash tattoo gallery ── */}
      {flashCards.length > 0 && (
        <div id="flash" className="scroll-mt-24">
          <FlashSection
            studioSlug={params.studio}
            designs={flashCards}
            brandColor={brand.full}
            textOnBrand={brand.textOnBrand}
          />
        </div>
      )}

      {/* ── Reviews ── */}
      <ReviewsSection reviews={reviews} brandColor={brand.full} />

      {/* ── FAQ ── */}
      {faqEntries.length > 0 && (
        <section id="faq" className="mt-20 md:mt-24 scroll-mt-24">
          <div className="mb-8">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">Questions</p>
            <h2 className="font-serif text-2xl md:text-3xl tracking-wide">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {(faqEntries as KnowledgeEntry[]).map((entry) => (
              <details
                key={entry.id}
                className="group bg-zinc-900/50 border border-white/[0.08] overflow-hidden"
              >
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none select-none">
                  <span className="text-sm font-semibold text-zinc-200 pr-4">{entry.title}</span>
                  <span
                    className="text-xs shrink-0 transition-transform group-open:rotate-45"
                    style={{ color: brand.full }}
                  >
                    +
                  </span>
                </summary>
                <div className="px-5 pb-5">
                  <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">{entry.content}</p>
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* ── Closing CTA ── */}
      <section
        className="mt-20 md:mt-24 px-8 py-14 text-center"
        style={{ border: `1px solid ${brand.subtle}`, borderTop: `3px solid ${brand.full}` }}
      >
        <h2 className="font-serif text-2xl md:text-3xl tracking-wide mb-3">Ready to plan your next piece?</h2>
        <p className="text-zinc-500 text-sm mb-8 max-w-md mx-auto">
          Answer a few questions and our AI will analyze your vision, detect your style, and build a complete brief for the artist.
        </p>
        <Link
          href={`/book/${params.studio}/login`}
          className="inline-block text-sm font-bold uppercase tracking-widest px-8 py-3.5 transition-opacity hover:opacity-90"
          style={{ backgroundColor: brand.full, color: brand.textOnBrand }}
        >
          Start AI Consultation →
        </Link>
      </section>

      {/* Deposit notice */}
      <p className="text-[10px] uppercase tracking-widest text-zinc-700 text-center mt-14">
        A deposit is collected at booking and applied toward your session.
        It is non-refundable for no-shows or cancellations within 48 hours.
      </p>

      {/* Footer */}
      <div className="mt-12 border-t border-white/[0.08]" />
      <footer className="mt-8 text-center">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <Link href="/privacy" className="text-[10px] uppercase tracking-widest text-zinc-700 hover:text-zinc-500 transition-colors">
            Privacy Policy
          </Link>
          <span className="text-zinc-700" aria-hidden>·</span>
          <Link href="/terms" className="text-[10px] uppercase tracking-widest text-zinc-700 hover:text-zinc-500 transition-colors">
            Terms of Service
          </Link>
          <span className="text-zinc-700" aria-hidden>·</span>
          <span className="text-[10px] uppercase tracking-widest text-zinc-700">Powered by InkBook</span>
        </div>
      </footer>
    </div>
  );
}
