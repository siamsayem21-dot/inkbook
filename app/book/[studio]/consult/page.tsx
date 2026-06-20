export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import ConsultationForm from "./ConsultationForm";

interface Props {
  params: { studio: string };
}

function getBrand(hex: string) {
  const h   = (hex ?? "#D4AF37").replace("#", "").padEnd(6, "0").slice(0, 6);
  const r   = parseInt(h.slice(0, 2), 16) || 0;
  const g   = parseInt(h.slice(2, 4), 16) || 0;
  const b   = parseInt(h.slice(4, 6), 16) || 0;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return { full: `#${h}`, textOnBrand: lum > 0.5 ? "#000000" : "#ffffff" };
}

export default async function ConsultationPage({ params }: Props) {
  const supabase = createAdminClient();

  const { data: studioData } = await supabase
    .from("studios")
    .select("id, name, primary_color")
    .eq("subdomain", params.studio)
    .single();

  const studio = studioData as { id: string; name: string; primary_color: string | null } | null;
  if (!studio) notFound();

  const brand = getBrand(studio.primary_color ?? "#D4AF37");

  return (
    <div className="min-h-screen bg-[#080808]">
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-8 md:py-14">
        {/* Back link */}
        <Link
          href={`/book/${params.studio}`}
          className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-8"
        >
          ← Back to {studio.name}
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div
            className="inline-flex items-center gap-2.5 px-4 py-1.5 mb-5"
            style={{ border: `1px solid ${brand.full}40` }}
          >
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: brand.full }} />
            <span className="text-[10px] uppercase tracking-widest" style={{ color: `${brand.full}cc` }}>
              AI Consultation
            </span>
          </div>
          <h1 className="font-cinzel text-3xl md:text-4xl font-bold tracking-wide mb-3">
            Start Your Tattoo Journey
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-lg">
            Answer a few questions about your vision. Our AI will analyze your idea, detect the best
            style match, and build a complete brief for the artist — all in under 3 minutes.
          </p>

          {/* What you get */}
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              { icon: "⚡", label: "3 min", sub: "Average time" },
              { icon: "🤖", label: "AI Powered", sub: "Style detection" },
              { icon: "📋", label: "Full Brief", sub: "Sent to artist" },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-[#0d0d0d] border border-[#1E1E1E] rounded-xl px-3 py-3 text-center"
              >
                <p className="text-base mb-0.5">{item.icon}</p>
                <p className="text-xs font-semibold text-zinc-300">{item.label}</p>
                <p className="text-[10px] text-zinc-600">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <ConsultationForm
          studioSlug={params.studio}
          studioId={studio.id}
          studioName={studio.name}
          primaryColor={brand.full}
          textOnBrand={brand.textOnBrand}
        />
      </div>
    </div>
  );
}
