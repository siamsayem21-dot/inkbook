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
      className="group block bg-zinc-900/50 border border-white/[0.08] p-6 hover:border-gold/40 transition-all duration-300 hover:bg-zinc-900"
    >
      {/* Avatar */}
      <div className="w-16 h-16 bg-zinc-800 mb-5 overflow-hidden ring-1 ring-white/[0.06] group-hover:ring-gold/20 transition-all">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-cinzel text-white/25 text-xl font-bold">
              {name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Name + rate */}
      <h3 className="font-cinzel font-bold text-sm tracking-wide mb-0.5">{name}</h3>
      <p className="text-gold text-xs font-medium mb-3">From ${minRate}/hr</p>

      {/* Bio snippet */}
      {bio && (
        <p className="text-zinc-500 text-xs leading-relaxed mb-3 line-clamp-2">{bio}</p>
      )}

      {/* Style tags */}
      {styles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          {styles.slice(0, 4).map((s) => (
            <span
              key={s}
              className="text-[9px] uppercase tracking-[0.08em] bg-white/[0.04] text-zinc-500 px-2 py-0.5 border border-white/[0.06]"
            >
              {s}
            </span>
          ))}
          {styles.length > 4 && (
            <span className="text-xs text-zinc-600">+{styles.length - 4}</span>
          )}
        </div>
      )}

      {/* CTA */}
      <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
        <span className="label-xs text-zinc-600">View Profile</span>
        <span className="text-xs text-gold font-semibold group-hover:translate-x-0.5 transition-transform inline-block">
          Book Now →
        </span>
      </div>
    </Link>
  );
}
