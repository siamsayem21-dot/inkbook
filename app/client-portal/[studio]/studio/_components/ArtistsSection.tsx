import Link from "next/link";
import { Users } from "lucide-react";
import SectionShell from "./SectionShell";
import EmptyState from "./EmptyState";

export interface StudioArtist {
  id: string;
  name: string;
  bio: string | null;
  styles: string[];
  avatarUrl: string | null;
  profileHref: string;
}

interface Props {
  artists: StudioArtist[];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
}

export default function ArtistsSection({ artists }: Props) {
  return (
    <SectionShell id="artists" icon={Users} eyebrow="Meet the Team" title="Artists" subtitle="Real artists working at this studio.">
      {artists.length === 0 ? (
        <EmptyState message="No artists listed yet." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {artists.map((artist) => (
            <div key={artist.id} className="rounded-2xl border border-zinc-100 p-5 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                {artist.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={artist.avatarUrl} alt={artist.name} className="w-12 h-12 rounded-full object-cover shrink-0" />
                ) : (
                  <span className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-white text-sm font-semibold flex items-center justify-center shrink-0">
                    {initials(artist.name)}
                  </span>
                )}
                <p className="text-sm font-semibold text-zinc-900">{artist.name}</p>
              </div>

              {artist.styles.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {artist.styles.slice(0, 4).map((s) => (
                    <span key={s} className="text-[11px] font-medium text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full">
                      {s}
                    </span>
                  ))}
                </div>
              )}

              {artist.bio && <p className="text-xs text-zinc-500 leading-relaxed line-clamp-3 mb-4">{artist.bio}</p>}

              <Link
                href={artist.profileHref}
                className="mt-auto text-xs font-semibold text-violet-600 hover:text-violet-700 transition-colors pt-3 border-t border-zinc-100"
              >
                View Artist →
              </Link>
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  );
}
