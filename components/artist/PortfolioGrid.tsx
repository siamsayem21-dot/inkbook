interface Props {
  images?: { id: string; url: string; style: string }[];
  editable?: boolean;
}

export default function PortfolioGrid({ images = [], editable = false }: Props) {
  if (images.length === 0) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square bg-zinc-800 border border-zinc-700 rounded-xl flex items-center justify-center text-zinc-600 text-xs"
          >
            {editable ? "+ Add" : ""}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {images.map((img) => (
        <div key={img.id} className="aspect-square bg-zinc-800 rounded-xl overflow-hidden relative group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.url} alt={img.style} className="w-full h-full object-cover" />
          {editable && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <button className="text-white text-xs">Remove</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
