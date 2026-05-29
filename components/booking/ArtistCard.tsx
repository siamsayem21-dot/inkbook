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
      className="group block bg-zinc-900 border border-white/10 rounded-2xl p-6 hover:border-gold/50 transition-all duration-200 hover:bg-zinc-900/80"
    >
      {/* Avatar */}
      <div className="w-16 h-16 rounded-full bg-zinc-800 mb-5 overflow-hidden ring-2 ring-white/5 group-hover:ring-gold/20 transition-all">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/30 text-xl font-bold">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Name + rate */}
      <h3 className="font-bold text-base mb-0.5">{name}</h3>
      <p className="text-gold text-sm mb-3">From ${minRate}/hr</p>

      {/* Bio snippet */}
      {bio && (
        <p className="text-white/40 text-xs leading-relaxed mb-3 line-clamp-2">{bio}</p>
      )}

      {/* Style tags */}
      {styles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          {styles.slice(0, 4).map((s) => (
            <span
              key={s}
              className="text-xs bg-white/5 text-white/50 px-2.5 py-0.5 rounded-full border border-white/8"
            >
              {s}
            </span>
          ))}
          {styles.length > 4 && (
            <span className="text-xs text-white/30">+{styles.length - 4}</span>
          )}
        </div>
      )}

      {/* CTA */}
      <div className="flex items-center justify-between pt-4 border-t border-white/8">
        <span className="text-xs text-white/30">View profile</span>
        <span className="text-sm text-gold font-semibold group-hover:translate-x-0.5 transition-transform inline-block">
          Book now →
        </span>
      </div>
    </Link>
  );
}
