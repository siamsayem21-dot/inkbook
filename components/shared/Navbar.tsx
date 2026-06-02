import Link from "next/link";

interface Props {
  studioName?: string;
  logoUrl?: string;
}

export default function Navbar({ studioName = "InkBook", logoUrl }: Props) {
  return (
    <header className="border-b border-white/[0.06] bg-ink px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={studioName} className="h-7 w-auto object-contain" />
        ) : (
          <div className="w-7 h-7 border border-gold/40 flex items-center justify-center shrink-0">
            <span className="font-cinzel text-gold text-[10px] font-bold">
              {studioName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <span className="font-cinzel font-bold tracking-wide text-sm">{studioName}</span>
      </div>
      <Link href="/" className="label-xs text-zinc-700 hover:text-zinc-500 transition-colors">
        Powered by InkBook
      </Link>
    </header>
  );
}
