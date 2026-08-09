export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicFaq } from "@/lib/studio-knowledge";
import { getPublicReviews, getPortfolioImages } from "@/lib/studio-content";
import StudioHero from "./_components/StudioHero";
import ArtistsSection, { type StudioArtist } from "./_components/ArtistsSection";
import PortfolioGallery, { type PortfolioItem } from "./_components/PortfolioGallery";
import FlashDesignsSection, { type FlashItem } from "./_components/FlashDesignsSection";
import ReviewsList from "./_components/ReviewsList";
import FaqAccordion from "./_components/FaqAccordion";
import PoliciesSection from "./_components/PoliciesSection";
import LocationContactCard from "./_components/LocationContactCard";
import BottomCta from "./_components/BottomCta";

interface Props {
  params: { studio: string };
}

type StudioRow = {
  id: string;
  name: string;
  logo_url: string | null;
  address: string | null;
  state: string | null;
  about: string | null;
  phone: string | null;
  contact_email: string | null;
  hours: string | null;
};

type ArtistRow = {
  id: string;
  name: string;
  bio: string | null;
  styles: string[];
  avatar_url: string | null;
};

type FlashRow = {
  id: string;
  artist_id: string | null;
  title: string;
  image_url: string;
  category: string | null;
  is_available: boolean;
};

export default async function StudioPage({ params }: Props) {
  const supabase = createAdminClient();

  const { data: studioData } = await supabase
    .from("studios")
    .select("id, name, logo_url, address, state, about, phone, contact_email, hours")
    .eq("subdomain", params.studio)
    .single();

  const studio = studioData as StudioRow | null;
  if (!studio) notFound();

  const { data: artistRows } = await supabase
    .from("artists")
    .select("id, name, bio, styles, avatar_url")
    .eq("studio_id", studio.id)
    .eq("is_active" as never, true)
    .order("name");
  const artists = (artistRows ?? []) as ArtistRow[];
  const artistNameById = new Map(artists.map((a) => [a.id, a.name]));

  const { data: flashRows } = await supabase
    .from("flash_designs")
    .select("id, artist_id, title, image_url, category, is_available")
    .eq("studio_id", studio.id)
    .order("created_at", { ascending: false });
  const flash = (flashRows ?? []) as FlashRow[];

  const [reviews, portfolioRows, knowledge] = await Promise.all([
    getPublicReviews(studio.id),
    getPortfolioImages(studio.id),
    getPublicFaq(studio.id),
  ]);

  const faqItems = knowledge.filter((k) => k.category === "faq").map((k) => ({ id: k.id, title: k.title, content: k.content }));
  const policyItems = knowledge.filter((k) => k.category === "policy").map((k) => ({ id: k.id, title: k.title, content: k.content }));

  const averageRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null;

  const consultationHref = `/portal/${params.studio}/consultation`;

  const studioArtists: StudioArtist[] = artists.map((a) => ({
    id: a.id,
    name: a.name,
    bio: a.bio,
    styles: a.styles,
    avatarUrl: a.avatar_url,
    profileHref: `/book/${params.studio}/${a.id}`,
  }));

  const portfolioItems: PortfolioItem[] = portfolioRows.map((p) => ({
    id: p.id,
    imageUrl: p.image_url,
    style: p.style,
    artistName: artistNameById.get(p.artist_id) ?? "Artist",
  }));

  const flashItems: FlashItem[] = flash.map((f) => ({
    id: f.id,
    title: f.title,
    imageUrl: f.image_url,
    category: f.category,
    artistName: f.artist_id ? artistNameById.get(f.artist_id) ?? null : null,
    isAvailable: f.is_available,
    chooseHref: `/book/${params.studio}/flash/${f.id}/book`,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] leading-tight font-bold text-zinc-900">Studio</h1>
        <p className="text-sm text-zinc-500 mt-1.5">Get to know {studio.name} — artists, work, and how to get started.</p>
      </div>

      <StudioHero
        studioName={studio.name}
        logoUrl={studio.logo_url}
        about={studio.about}
        location={[studio.address, studio.state].filter(Boolean).join(", ") || null}
        averageRating={averageRating}
        reviewCount={reviews.length}
        consultationHref={consultationHref}
      />

      <ArtistsSection artists={studioArtists} />

      <PortfolioGallery items={portfolioItems} />

      <FlashDesignsSection items={flashItems} />

      <ReviewsList reviews={reviews.map((r) => ({ id: r.id, authorName: r.author_name, rating: r.rating, quote: r.quote }))} />

      <FaqAccordion items={faqItems} />

      <PoliciesSection items={policyItems} />

      <LocationContactCard
        address={studio.address}
        state={studio.state}
        phone={studio.phone}
        contactEmail={studio.contact_email}
        hours={studio.hours}
      />

      <BottomCta consultationHref={consultationHref} />
    </div>
  );
}
