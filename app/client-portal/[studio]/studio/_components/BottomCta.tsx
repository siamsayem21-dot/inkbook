import Link from "next/link";
import { Sparkles } from "lucide-react";

interface Props {
  consultationHref: string;
}

export default function BottomCta({ consultationHref }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm px-6 py-12 text-center">
      <h2 className="text-2xl font-bold text-zinc-900 mb-2">Ready to start your tattoo?</h2>
      <p className="text-sm text-zinc-500 mb-6 max-w-md mx-auto">
        Tell InkBook AI your idea and we&apos;ll help you define your style, size, and placement.
      </p>
      <Link
        href={consultationHref}
        className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-[15px] font-semibold rounded-xl px-6 py-3.5 transition-colors"
      >
        Start a Consultation
        <Sparkles size={16} />
      </Link>
    </div>
  );
}
