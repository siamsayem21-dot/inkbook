import Link from "next/link";

interface Props {
  studioSlug: string;
  artistId?: string;
  name?: string;
  bio?: string;
  styles?: string[];
  minRate?: number;
  avatarUrl?: string;
}

export default function ArtistCard({
  studioSlug,
  artistId = "placeholder",
  name = "Artist",
  bio,
  styles = [],
  minRate = 150,
  avatarUrl,
}: Props) {
  return (
    <Link
      href={`/book/${studioSlug}/${artistId}`}
      className="group block bg-zinc-900/50 border border-white/[0.08] hover:border-[#DC2626]/40 transition-all duration-300 hover:bg-zinc-900 hover:shadow-xl hover:shadow-black/60"
    >
      {/* Full-width artist photo */}
      <div className="aspect-[4/5] overflow-hidden bg-zinc-800 relative">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-cinzel text-white/20 text-6xl font-bold">
              {name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-5">
        {/* Name + rate */}
        <h3 className="font-cinzel font-bold text-base tracking-wide mb-1">{name}</h3>
        <p className="text-gold text-sm font-semibold mb-3">From ${minRate}/hr</p>

        {/* Bio snippet */}
        {bio && (
          <p className="text-zinc-500 text-xs leading-relaxed mb-3 line-clamp-2">{bio}</p>
        )}

        {/* Style tags */}
        {styles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {styles.slice(0, 3).map((s) => (
              <span
                key={s}
                className="text-[9px] uppercase tracking-[0.08em] bg-white/[0.04] text-zinc-500 px-2 py-0.5 border border-white/[0.06]"
              >
                {s}
              </span>
            ))}
            {styles.length > 3 && (
              <span className="text-xs text-zinc-600">+{styles.length - 3}</span>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
          <span className="label-xs text-zinc-600">View Profile</span>
          <span className="text-xs font-semibold text-zinc-500 group-hover:text-[#DC2626] group-hover:translate-x-0.5 transition-all duration-200 inline-block">
            Book Now →
          </span>
        </div>
      </div>
    </Link>
  );
}
