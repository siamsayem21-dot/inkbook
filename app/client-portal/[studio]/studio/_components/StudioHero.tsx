import Link from "next/link";
import { MapPin, Sparkles, Star } from "lucide-react";

interface Props {
  studioName: string;
  logoUrl: string | null;
  about: string | null;
  location: string | null;
  averageRating: number | null;
  reviewCount: number;
  consultationHref: string;
}

export default function StudioHero({ studioName, logoUrl, about, location, averageRating, reviewCount, consultationHref }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-start gap-6">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={studioName} className="w-20 h-20 rounded-2xl object-cover border border-zinc-200 shrink-0" />
        ) : (
          <span className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 text-white text-2xl font-bold flex items-center justify-center shrink-0">
            {studioName.charAt(0).toUpperCase()}
          </span>
        )}

        <div className="flex-1 min-w-0">
          <h1 className="text-[28px] leading-tight font-bold text-zinc-900">{studioName}</h1>

          <div className="flex items-center gap-4 flex-wrap mt-2 mb-4">
            {location && (
              <span className="inline-flex items-center gap-1.5 text-sm text-zinc-500">
                <MapPin size={14} className="text-zinc-400" />
                {location}
              </span>
            )}
            {averageRating != null ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-zinc-700 font-medium">
                <Star size={14} className="fill-amber-400 text-amber-400" />
                {averageRating.toFixed(1)}
                <span className="text-zinc-400 font-normal">
                  ({reviewCount} review{reviewCount !== 1 ? "s" : ""})
                </span>
              </span>
            ) : (
              <span className="text-sm text-zinc-400">No reviews yet</span>
            )}
          </div>

          <p className="text-sm text-zinc-600 leading-relaxed max-w-2xl">
            {about || `${studioName} hasn't added a studio description yet.`}
          </p>

          <Link
            href={consultationHref}
            className="mt-6 inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl px-6 py-3.5 transition-colors"
          >
            Start a Consultation
            <Sparkles size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}
