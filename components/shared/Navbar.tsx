import Link from "next/link";

interface Props {
  studioName?: string;
  logoUrl?: string;
}

export default function Navbar({ studioName = "InkBook", logoUrl }: Props) {
  return (
    <header className="border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={studioName} className="h-8 w-auto object-contain" />
        )}
        <span className="font-bold text-lg">{studioName}</span>
      </div>
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900">
        Powered by InkBook
      </Link>
    </header>
  );
}
