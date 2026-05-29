export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import BookingForm from "@/components/booking/BookingForm";

interface Props {
  params: { studio: string; artistId: string };
}

const STEPS = ["Your details", "Pay deposit", "Sign consent"];

export default async function BookingFormPage({ params }: Props) {
  const supabase = createAdminClient();

  const { data: artistData } = await supabase
    .from("artists")
    .select("name")
    .eq("id", params.artistId)
    .single();

  const artist = artistData as { name: string } | null;
  if (!artist) notFound();

  return (
    <main className="max-w-xl mx-auto px-6 py-10">

      {/* Back */}
      <Link
        href={`/book/${params.studio}/${params.artistId}`}
        className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-8"
      >
        ← {artist.name}
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
              <span className={`text-xs ${i === 0 ? "text-white font-medium" : "text-white/40"} hidden sm:block`}>
                {step}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="w-8 h-px bg-white/10 mx-1" />
            )}
          </div>
        ))}
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Your appointment details</h1>
        <p className="text-white/40 text-sm">
          Booking with <span className="text-white/60">{artist.name}</span> · A deposit is required to confirm.
        </p>
      </div>

      <BookingForm studioSlug={params.studio} artistId={params.artistId} />
    </main>
  );
}
