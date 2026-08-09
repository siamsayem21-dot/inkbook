import Link from "next/link";
import { Sparkles } from "lucide-react";
import SectionShell from "./SectionShell";
import EmptyState from "./EmptyState";

export interface FlashItem {
  id: string;
  title: string;
  imageUrl: string;
  category: string | null;
  artistName: string | null;
  isAvailable: boolean;
  chooseHref: string;
}

interface Props {
  items: FlashItem[];
}

// Ready-to-book artwork a client can pick off a menu — never completed
// tattoo photography (that's PortfolioGallery.tsx). "Choose Design" reuses
// the real, already-working per-flash public booking flow
// (/book/[studio]/flash/[flashId]/book) rather than a new booking path.
export default function FlashDesignsSection({ items }: Props) {
  return (
    <SectionShell id="flash" icon={Sparkles} eyebrow="Ready to Book" title="Flash Designs" subtitle="Available artwork you can book immediately.">
      {items.length === 0 ? (
        <EmptyState message="No flash designs available right now." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-zinc-100 overflow-hidden flex flex-col">
              <div className="relative aspect-square bg-zinc-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                {!item.isAvailable && (
                  <span className="absolute top-2 left-2 text-[10px] font-medium text-white bg-zinc-900/80 px-2 py-0.5 rounded-full">
                    Booked
                  </span>
                )}
              </div>
              <div className="p-3.5 flex-1 flex flex-col">
                <p className="text-sm font-semibold text-zinc-900 truncate">{item.title}</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {item.category ?? "Flash"}
                  {item.artistName ? ` · ${item.artistName}` : ""}
                </p>
                {item.isAvailable ? (
                  <Link
                    href={item.chooseHref}
                    className="mt-3 text-center text-xs font-semibold text-violet-600 hover:text-violet-700 border border-violet-200 hover:border-violet-300 rounded-lg py-2 transition-colors"
                  >
                    Choose Design →
                  </Link>
                ) : (
                  <span className="mt-3 text-center text-xs font-medium text-zinc-300 border border-zinc-100 rounded-lg py-2">
                    Not Available
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  );
}
