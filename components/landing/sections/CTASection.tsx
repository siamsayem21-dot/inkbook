import Link from "next/link";

export default function CTASection() {
  return (
    <section className="px-6 py-24 md:py-36 border-t border-white/[0.06]">
      <div className="max-w-3xl mx-auto text-center">
        <p className="text-[11px] tracking-[0.18em] uppercase text-zinc-600 font-medium mb-6">
          Early access
        </p>

        <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[0.95] text-white mb-6 text-balance">
          Your studio.
          <br />
          <span className="text-zinc-500">Running itself.</span>
        </h2>

        <p className="text-zinc-500 text-base md:text-lg leading-relaxed mb-10 max-w-md mx-auto">
          Early studios get priority onboarding, locked-in pricing, and a
          dedicated setup call. Limited spots open now.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
          <Link
            href="#"
            className="h-12 px-8 bg-white text-black text-[13px] font-semibold hover:bg-zinc-100 transition-colors duration-200 flex items-center gap-2 group"
          >
            Start free trial
            <span
              className="group-hover:translate-x-0.5 transition-transform duration-150"
              aria-hidden
            >
              →
            </span>
          </Link>
          <Link
            href="#"
            className="h-12 px-8 border border-white/[0.12] text-zinc-400 text-[13px] hover:border-white/25 hover:text-white transition-all duration-200 flex items-center"
          >
            Book a demo call
          </Link>
        </div>

        {/* Social proof */}
        <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1 text-[11px] text-zinc-700">
          <span>14-day free trial</span>
          <span className="mx-1">·</span>
          <span>No credit card required</span>
          <span className="mx-1">·</span>
          <span>Cancel anytime</span>
        </div>
      </div>
    </section>
  );
}
