export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import FlashBookingForm from "./FlashBookingForm";

interface Props {
  params: { studio: string; flashId: string };
}

type FlashDesign = {
  id: string;
  artist_id: string;
  title: string;
  description: string | null;
  image_url: string;
  price: number;
  category: string | null;
  is_repeatable: boolean;
  is_available: boolean;
  is_booked: boolean;
};

const STEPS = ["Your details", "Pay deposit", "Sign consent"];

export default async function FlashBookingPage({ params }: Props) {
  const supabase = createAdminClient();

  const { data: designRaw } = await supabase
    .from("flash_designs")
    .select("id, artist_id, title, description, image_url, price, category, is_repeatable, is_available, is_booked")
    .eq("id", params.flashId)
    .single();

  const design = designRaw as FlashDesign | null;

  // 404 if not found, hidden, or one-time already booked
  if (!design || !design.is_available) notFound();
  if (!design.is_repeatable && design.is_booked)  notFound();

  const { data: artistRaw } = await supabase
    .from("artists")
    .select("name")
    .eq("id", design.artist_id)
    .single();

  const artist = artistRaw as { name: string } | null;
  if (!artist) notFound();

  return (
    <main className="max-w-xl mx-auto px-6 py-10">

      {/* Back */}
      <Link
        href={`/book/${params.studio}`}
        className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-8"
      >
        ← Browse Flash
      </Link>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-10">
        {STEPS.map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 ${i === 0 ? "" : "opacity-40"}`}>
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  i === 0 ? "bg-gold text-black" : "bg-zinc-800 text-white/50"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`text-xs hidden sm:block ${
                  i === 0 ? "text-white font-medium" : "text-white/40"
                }`}
              >
                {step}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="w-8 h-px bg-white/10 mx-1" />
            )}
          </div>
        ))}
      </div>

      {/* Flash design preview card */}
      <div className="bg-zinc-900/60 border border-white/[0.08] rounded-xl overflow-hidden mb-8 flex gap-4 p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={design.image_url}
          alt={design.title}
          className="w-20 h-20 object-cover rounded-lg shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[#E8E8E8] mb-0.5 truncate">{design.title}</p>
          {design.description && (
            <p className="text-zinc-500 text-xs mb-2 line-clamp-2">{design.description}</p>
          )}
          <p className="text-[#c9a84c] font-semibold text-sm">
            ${(design.price / 100).toFixed(0)}
          </p>
          <p className="text-zinc-600 text-xs mt-0.5">by {artist.name}</p>
          {!design.is_repeatable && (
            <span className="inline-block mt-1.5 text-[9px] uppercase tracking-wide bg-[#c9a84c]/10 text-[#c9a84c] px-1.5 py-0.5 border border-[#c9a84c]/20 rounded">
              One-time design
            </span>
          )}
        </div>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Your appointment details</h1>
        <p className="text-white/40 text-sm">
          Booking with <span className="text-white/60">{artist.name}</span> · A deposit is required to confirm.
        </p>
      </div>

      <FlashBookingForm
        studioSlug={params.studio}
        artistId={design.artist_id}
        flashDesignId={design.id}
        flashTitle={design.title}
        flashCategory={design.category}
        isRepeatable={design.is_repeatable}
      />
    </main>
  );
}
