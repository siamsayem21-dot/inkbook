import { Image as ImageIcon } from "lucide-react";
import SectionShell from "./SectionShell";
import EmptyState from "./EmptyState";

export interface PortfolioItem {
  id: string;
  imageUrl: string;
  style: string | null;
  artistName: string;
}

interface Props {
  items: PortfolioItem[];
}

// Completed tattoo work — deliberately a different data source and a
// different section from Flash Designs (available/bookable artwork). See
// FlashDesignsSection.tsx for that one.
export default function PortfolioGallery({ items }: Props) {
  return (
    <SectionShell id="portfolio" icon={ImageIcon} eyebrow="Our Work" title="Portfolio" subtitle="Completed tattoos from this studio's artists.">
      {items.length === 0 ? (
        <EmptyState message="No portfolio photos published yet." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {items.map((item) => (
            <div key={item.id} className="group relative aspect-square rounded-xl overflow-hidden bg-zinc-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imageUrl}
                alt={item.style ?? item.artistName}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent px-3 pt-8 pb-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <p className="text-xs font-semibold text-white truncate">{item.artistName}</p>
                {item.style && <p className="text-[11px] text-white/80 truncate">{item.style}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  );
}
