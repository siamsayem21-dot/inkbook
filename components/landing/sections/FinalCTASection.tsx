import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function FinalCTASection() {
  return (
    <section className="grain relative px-6 py-28 text-center overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_50%_50%,rgba(220,38,38,0.06),transparent)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_35%_35%_at_80%_15%,rgba(201,168,76,0.04),transparent)] pointer-events-none" />
      <div className="relative z-10 max-w-2xl mx-auto">
        <p className="label-xs text-gold/70 mb-6">Early Access</p>
        <h2 className="font-cinzel text-4xl md:text-5xl font-bold tracking-wide mb-5 text-balance">
          Your studio. Running itself.
        </h2>
        <p className="text-zinc-500 mb-12 leading-relaxed max-w-md mx-auto text-sm">
          Early studios get priority onboarding, locked-in pricing, and a dedicated setup call. Limited spots available.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 label-sm bg-[#DC2626] text-white px-10 py-4 hover:bg-[#b91c1c] transition-colors group"
          >
            Start Free Trial
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            href="/book/demo-studio"
            className="inline-flex items-center justify-center label-sm border border-white/20 text-zinc-300 px-10 py-4 hover:border-white/40 hover:text-white transition-all"
          >
            Book Demo Call
          </Link>
        </div>

        {/* Social proof */}
        <div className="flex items-center justify-center gap-3">
          <div className="flex -space-x-2">
            {["JM", "AT", "SK"].map((i) => (
              <div
                key={i}
                className="w-7 h-7 bg-zinc-800 border-2 border-zinc-950 flex items-center justify-center"
              >
                <span className="text-[8px] text-zinc-400 font-bold">{i}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-600">200+ studios on the waitlist</p>
        </div>

        <p className="label-xs text-zinc-700 mt-6">14-day free trial · No credit card required</p>
      </div>
    </section>
  );
}
