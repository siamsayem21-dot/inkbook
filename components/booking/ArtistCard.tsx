import Link from "next/link";

interface Props {
  studioSlug: string;
  artistId?: string;
  name?: string;
  styles?: string[];
  minRate?: number;
  avatarUrl?: string;
}

export default function ArtistCard({
  studioSlug,
  artistId = "placeholder",
  name = "Artist name",
  styles = ["Traditional", "Blackwork"],
  minRate = 150,
  avatarUrl,
}: Props) {
  return (
    <Link
      href={`/book/${studioSlug}/${artistId}`}
      className="block bg-white border border-zinc-200 rounded-2xl p-5 hover:border-zinc-400 hover:shadow-md transition-all"
    >
      <div className="w-16 h-16 rounded-full bg-zinc-200 mb-4 overflow-hidden">
        {avatarUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        )}
      </div>
      <h3 className="font-semibold">{name}</h3>
      <p className="text-zinc-500 text-xs mt-1">From ${minRate}/hr</p>
      <div className="flex flex-wrap gap-1 mt-3">
        {styles.map((s) => (
          <span key={s} className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">
            {s}
          </span>
        ))}
      </div>
    </Link>
  );
}
