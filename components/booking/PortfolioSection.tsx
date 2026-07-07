export type PortfolioCard = {
  id: string;
  artist_id: string;
  artist_name: string;
  image_url: string;
  style: string | null;
};

interface Props {
  images: PortfolioCard[];
}

export default function PortfolioSection({ images }: Props) {
  if (images.length === 0) return null;

  return (
    <section id="portfolio" className="mt-20 scroll-mt-24">
      <div className="mb-8">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">Our Work</p>
        <h2 className="font-serif text-2xl md:text-3xl tracking-wide">Portfolio Gallery</h2>
        <p className="text-zinc-500 text-sm mt-2">A look at recent work from our artists.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {images.map((img) => (
          <div
            key={img.id}
            className="group relative aspect-square overflow-hidden bg-zinc-900 border border-white/[0.08] hover:border-white/20 transition-all duration-200"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.image_url}
              alt={img.style ?? img.artist_name}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pt-8 pb-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <p className="text-xs font-semibold text-white truncate">{img.artist_name}</p>
              {img.style && <p className="text-[10px] text-zinc-300 truncate">{img.style}</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
