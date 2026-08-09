import Link from "next/link";
import { UserRound } from "lucide-react";
import SectionCard from "./SectionCard";
import type { ArtistInfo } from "../types";

interface Props {
  artist: ArtistInfo | null;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
}

export default function ArtistCard({ artist }: Props) {
  if (!artist) {
    return (
      <SectionCard id="artist" icon={UserRound} title="Artist">
        <p className="text-sm text-zinc-500">Artist matching in progress — we&apos;ll notify you once someone is assigned.</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard id="artist" icon={UserRound} title="Artist">
      <div className="flex items-center gap-4">
        {artist.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={artist.avatarUrl} alt={artist.name} className="w-14 h-14 rounded-full object-cover shrink-0" />
        ) : (
          <span className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-white text-lg font-semibold flex items-center justify-center shrink-0">
            {initials(artist.name)}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-900">{artist.name}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{artist.specialty}</p>
          <p className="text-xs text-zinc-400 mt-0.5">{artist.studioName}</p>
        </div>
        {artist.profileHref && (
          <Link href={artist.profileHref} className="shrink-0 text-xs font-semibold text-violet-600 hover:text-violet-700 transition-colors">
            View Artist →
          </Link>
        )}
      </div>
    </SectionCard>
  );
}
