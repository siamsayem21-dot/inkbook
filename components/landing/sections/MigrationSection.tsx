import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";

const studios = [
  "Ink & Iron Studio",
  "Rose & Thorn Tattoo",
  "Black Anchor Co.",
  "Serpent & Rose",
  "Northern Ink",
];

export default function MigrationSection() {
  return (
    <section className="px-6 py-20">
      <div className="max-w-4xl mx-auto">
        <div className="border border-white/[0.08] bg-zinc-900/30 px-8 py-14 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,rgba(201,168,76,0.04),transparent)] pointer-events-none" />
          <div className="relative z-10">
            <div className="w-10 h-10 bg-gold/10 border border-gold/25 flex items-center justify-center mx-auto mb-6">
              <Zap className="w-4 h-4 text-gold" />
            </div>
            <p className="label-xs text-gold/70 mb-3">Switching from another system?</p>
            <h2 className="font-cinzel text-2xl md:text-3xl font-bold tracking-wide mb-4">
              We&apos;ll migrate your studio for free.
            </h2>
            <p className="text-zinc-500 text-sm max-w-md mx-auto mb-8">
              Our team handles the full data transfer — client records, booking history, consent forms. Most studios are live in 48 hours.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5 mb-10">
              {studios.map((s) => (
                <span
                  key={s}
                  className="text-[10px] text-zinc-600 border border-white/[0.06] px-3 py-1.5 bg-zinc-900/50"
                >
                  {s}
                </span>
              ))}
            </div>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 label-sm bg-[#DC2626] text-white px-7 py-3.5 hover:bg-[#b91c1c] transition-colors"
            >
              Talk to Migration Team
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
