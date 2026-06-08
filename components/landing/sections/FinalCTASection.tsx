import Link from "next/link";

export default function FinalCTASection() {
  return (
    <section
      className="relative px-6 py-32 border-t border-white/[0.06] overflow-hidden"
      style={{ background: "linear-gradient(180deg, #0B1020 0%, #0F172A 100%)" }}
    >
      {/* Glows */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 55% at 50% 110%, rgba(255,255,255,0.04) 0%, transparent 100%)" }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 50% 30% at 50% -5%, rgba(255,255,255,0.02) 0%, transparent 100%)" }} />

      <div className="relative z-10 max-w-3xl mx-auto text-center">

        <p className="text-white/20 text-sm mb-10 leading-relaxed">
          21,000 tattoo studios still run on Instagram DMs and Venmo.<br />
          The studios switching to InkBook won&apos;t go back.
        </p>

        <h2 className="text-4xl md:text-[3.5rem] font-bold tracking-[-0.03em] mb-12 text-white leading-[1.06]">
          Every inquiry answered.<br />
          Every deposit collected.<br />
          Every booking confirmed.
        </h2>

        <Link
          href="/register"
          className="inline-flex items-center justify-center gap-2.5 bg-white text-[#0F172A] text-sm font-bold px-12 py-4 hover:bg-white/90 transition-colors group mb-10"
        >
          Activate your studio
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="group-hover:translate-x-0.5 transition-transform">
            <path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>

        <p className="label-xs text-white/20">14-day free trial · No credit card required · All 11 modules included</p>
      </div>
    </section>
  );
}
