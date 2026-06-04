import Link from "next/link";
import Image from "next/image";
import {
  Zap,
  Palette,
  Link as LinkIcon,
  DollarSign,
  FileText,
  MessageSquare,
  Check,
} from "lucide-react";
import MobileNavMenu from "@/components/landing/MobileNavMenu";

// ── Feature type ────────────────────────────────────────────────────────────
type FeatureItem = {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
};

const features: FeatureItem[] = [
  {
    Icon: Zap,
    title: "Flash Management",
    body: "Upload ready-made designs. Clients book instantly. No back-and-forth.",
  },
  {
    Icon: Palette,
    title: "Custom Request Flow",
    body: "Clients submit ideas with reference photos. You approve before any money moves.",
  },
  {
    Icon: LinkIcon,
    title: "White-Label Booking",
    body: "Your URL. Your logo. Your colors. Built on InkBook, invisible to clients.",
  },
  {
    Icon: DollarSign,
    title: "Auto Deposits",
    body: "Collected at booking. Applied to session. Kept automatically on no-shows.",
  },
  {
    Icon: FileText,
    title: "Digital Consent Forms",
    body: "State-specific forms. ID photo verification. Signed before every session.",
  },
  {
    Icon: MessageSquare,
    title: "SMS Reminders",
    body: "Automated reminders sent 48hr and day-of. Clients show up prepared.",
  },
];

const steps = [
  { n: "01", title: "Sign Up & Brand It", body: "Set your colors, upload your logo. Done in under 10 minutes." },
  { n: "02", title: "Set Up Your Booking", body: "Customize your page, set availability, add your style tags." },
  { n: "03", title: "Share Your Link", body: "Share your booking URL — or connect your own domain." },
  { n: "04", title: "Automation Takes Over", body: "Clients book, pay deposits, sign forms. Platform handles everything." },
];

const plans = [
  {
    name: "Solo",
    price: "$49",
    artists: "1 artist",
    highlight: false,
    features: [
      "White-label booking page",
      "Mandatory deposit enforcement",
      "Digital consent forms",
      "SMS reminders",
      "Flash management",
      "Custom request flow",
    ],
  },
  {
    name: "Studio",
    price: "$79",
    artists: "2–5 artists",
    highlight: true,
    features: [
      "Everything in Solo",
      "Flash management",
      "Multi-artist dashboard",
      "Owner revenue reports",
      "Client blacklist",
      "Session agreements",
      "Priority support",
    ],
  },
  {
    name: "Pro",
    price: "$129",
    artists: "6+ artists",
    highlight: false,
    features: [
      "Everything in Studio",
      "Unlimited artists",
      "Advanced analytics",
      "Waitlist management",
      "ID verification",
      "White-glove setup call",
    ],
  },
];

const painPoints = [
  {
    title: "No-shows are killing your income",
    body: "Every empty chair costs you $150+. InkBook collects deposits automatically. No-show? You keep it.",
    image: "https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=600&q=80",
  },
  {
    title: "Paper consent forms are a lawsuit waiting to happen",
    body: "Digital consent forms with ID photo verification. Signed before every session. Stored forever.",
    image: "/tattoo/tattoo__(4).png",
  },
  {
    title: "Your booking page says 'Powered by someone else'",
    body: "White-label booking pages under your brand. Your URL. Your colors. Clients never know InkBook exists.",
    image: "https://images.unsplash.com/photo-1568515045052-f9a854d70bfd?w=600&q=80",
  },
];

const stats = [
  { value: "21,000+", label: "Studios Across USA & Canada" },
  { value: "Zero", label: "Hidden Fees" },
  { value: "All Plans", label: "Consent Forms Included" },
  { value: "Cancel", label: "Anytime" },
];

const galleryImages = [
  "/tattoo/tattoo__(1).png",
  "/tattoo/tattoo__(2).png",
  "/tattoo/tattoo__(3).png",
  "/tattoo/tattoo__(4).png",
  "/tattoo/tattoo__(5).png",
  "/tattoo/tattoo__(6).png",
  "/tattoo/tattoo__(7).png",
  "/tattoo/tattoo__(8).png",
];

const whyItems = [
  "White-label booking URL — your brand, your domain",
  "Zero hidden fees — ever",
  "Flash + Custom booking — both in one platform",
  "Consent forms on every plan — no upsell",
  "Save 5+ hours per week on admin work",
  "Cancel anytime — no contracts",
];

export default function HomePage() {
  return (
    <div className="bg-ink text-white min-h-screen font-inter">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-ink/90 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            {/* Fix 24: logo size +20% on mobile (w-10 h-10 vs w-8 h-8) */}
            <div className="w-10 h-10 md:w-8 md:h-8 border border-gold/50 flex items-center justify-center shrink-0">
              <span className="font-cinzel text-gold text-[11px] md:text-[10px] font-bold tracking-wider">IB</span>
            </div>
            <span className="font-cinzel text-base tracking-wider text-white">InkBook</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="label-xs text-zinc-500 hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="label-xs text-zinc-500 hover:text-white transition-colors">How It Works</a>
            <a href="#pricing" className="label-xs text-zinc-500 hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/login" className="label-xs text-zinc-500 hover:text-white transition-colors hidden md:block">
              Sign In
            </Link>
            <Link
              href="/register"
              className="label-xs bg-[#DC2626] text-white text-xs px-3 py-1.5 md:px-5 md:py-2.5 hover:bg-[#b91c1c] transition-all duration-200"
            >
              Start Free Trial
            </Link>
            {/* Fix 21: hamburger menu for mobile */}
            <MobileNavMenu />
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      {/* Fix 15 + 28: lighter overlay (0.45) + confirmed background image */}
      <section className="grain relative text-center px-6 pt-24 pb-24 overflow-hidden min-h-[92vh] flex items-center justify-center">
        <Image
          src="https://images.unsplash.com/photo-1568515045052-f9a854d70bfd?w=1600&q=80"
          alt="Tattoo artist at work"
          fill
          className="object-cover"
          unoptimized
          priority
        />
        <div className="absolute inset-0 bg-black/45 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(220,38,38,0.04),transparent)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_100%,rgba(201,168,76,0.03),transparent)] pointer-events-none" />
        <div className="relative z-10 max-w-5xl mx-auto w-full">
          <div className="inline-flex items-center gap-2.5 border border-gold/25 px-5 py-2 mb-10">
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse shrink-0" />
            <span className="label-xs text-gold/80">Built for USA & Canada Tattoo Studios</span>
          </div>

          <h1 className="font-cinzel text-6xl md:text-8xl font-bold leading-[1.05] tracking-wide mb-8 text-balance">
            Your Studio.<br />
            Your Brand.<br />
            <span className="text-red-500">Zero Chaos.</span>
          </h1>

          <p className="text-zinc-400 text-lg md:text-xl mb-12 max-w-sm sm:max-w-2xl mx-auto leading-relaxed font-light">
            Auto deposits. Digital consent forms. White-label booking — built exclusively for tattoo studios.
          </p>

          {/* Fix 16: max 12px gap on mobile between CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link
              href="/register"
              className="label-sm bg-[#DC2626] text-white px-10 py-4 hover:bg-[#b91c1c] transition-colors"
            >
              Start Free Trial →
            </Link>
            <Link
              href="/book/demo-studio"
              className="label-sm border border-white/20 text-zinc-400 px-10 py-4 hover:border-white/40 hover:text-white transition-all"
            >
              See a Live Page
            </Link>
          </div>
          <p className="label-xs text-zinc-700 mt-6">No credit card required · Cancel anytime</p>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <div className="border-y border-white/[0.06] bg-zinc-900/40">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center py-7 px-4">
              <div className="font-cinzel text-xl md:text-2xl font-bold text-white mb-1.5">{s.value}</div>
              <div className="label-xs text-zinc-500">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Pain Section ── */}
      <section className="px-6 py-24 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          {/* Fix 25: changed "vibes" → "spreadsheets" */}
          <h2 className="font-cinzel text-3xl md:text-5xl font-bold tracking-wide mb-5 text-balance">
            STILL RUNNING YOUR STUDIO ON INSTAGRAM DMS AND SPREADSHEETS?
          </h2>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            You&apos;re losing money every week. Here&apos;s how.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {painPoints.map((p) => (
            <div
              key={p.title}
              className="bg-zinc-900/50 border border-white/[0.07] overflow-hidden group flex flex-col h-full"
              style={{ borderLeft: "3px solid #DC2626" }}
            >
              <div className="relative w-full h-48">
                {/* Fix 26: loading="lazy" on pain card images */}
                <Image
                  src={p.image}
                  alt={p.title}
                  fill
                  className="object-cover"
                  unoptimized
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors" />
              </div>
              <div className="p-8 flex-1">
                <h3 className="font-cinzel font-bold text-sm tracking-wide mb-4 leading-snug text-white">
                  {p.title}
                </h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{p.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="gold-divider" />

      {/* ── How It Works ── */}
      <section id="how-it-works" className="px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="label-xs text-gold/70 mb-4">Simple by Design</p>
            <h2 className="font-cinzel text-3xl md:text-4xl font-bold tracking-wide">
              Up and running in 10 minutes.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 md:gap-6">
            {steps.map((s) => (
              <div key={s.n} className="text-center">
                {/* Fix 23: step numbers 30% smaller on mobile */}
                <div className="font-cinzel text-4xl md:text-5xl font-bold text-red-500 mb-5 tracking-tighter leading-none">
                  {s.n}
                </div>
                <h3 className="font-cinzel font-semibold text-xs tracking-wide mb-3">{s.title}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="gold-divider" />

      {/* ── Features ── */}
      <section id="features" className="grain px-6 py-24 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="label-xs text-gold/70 mb-4">Platform</p>
          <h2 className="font-cinzel text-3xl md:text-4xl font-bold tracking-wide">
            Everything your studio needs.
          </h2>
          {/* Fix 18: changed tagline */}
          <p className="text-zinc-500 mt-3 text-sm">Everything included. Nothing hidden.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.05]">
          {/* Fix 17: Lucide icons replacing emojis */}
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-ink p-8 hover:bg-zinc-900/60 transition-colors group"
            >
              <f.Icon className="w-7 h-7 text-gold mb-5" />
              <h3 className="font-cinzel font-semibold text-xs tracking-wide mb-3 leading-snug">{f.title}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="gold-divider" />

      {/* ── Gallery ── */}
      <section className="py-16 overflow-hidden">
        <div className="text-center mb-14 px-6">
          <p className="label-xs text-gold/70 mb-4">The Community</p>
          <h2 className="font-cinzel text-3xl md:text-4xl font-bold tracking-wide mb-4">
            Built for studios like yours.
          </h2>
          <p className="text-zinc-500 text-sm">
            Join studios already ditching the DM chaos.
          </p>
        </div>

        {/* Fix 2: Mobile 2x2 grid (min 4 images) */}
        <div className="grid grid-cols-2 gap-3 px-4 sm:hidden">
          {galleryImages.slice(0, 4).map((src, i) => (
            <div key={i} className="overflow-hidden rounded-lg">
              <Image
                src={src}
                alt="Tattoo studio"
                width={300}
                height={220}
                className="object-cover rounded-lg w-full h-[220px]"
                unoptimized={true}
                loading="lazy"
              />
            </div>
          ))}
        </div>

        {/* Desktop scrolling gallery — hidden on mobile */}
        <div className="relative hidden sm:block">
          <div className="absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-black to-transparent pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-black to-transparent pointer-events-none" />
          {/* Fix 26: loading="lazy" on gallery images */}
          <div className="flex gap-4 pl-4 animate-scroll-gallery">
            {[...galleryImages, ...galleryImages].map((src, i) => (
              <div key={i} className="flex-shrink-0">
                <Image
                  src={src}
                  alt="Tattoo studio"
                  width={300}
                  height={220}
                  className="object-cover rounded-lg w-[300px] h-[220px]"
                  unoptimized={true}
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="gold-divider" />

      {/* ── Why InkBook? (replaces comparison table — fixes 7 + 8) ── */}
      <section className="px-6 py-24" style={{ backgroundColor: "#0A0A0A" }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <p className="label-xs text-gold/70 mb-4">Why InkBook?</p>
            <h2 className="font-cinzel text-3xl md:text-4xl font-bold tracking-wide">
              Built Different. On Purpose.
            </h2>
          </div>
          <ul className="space-y-4">
            {whyItems.map((item) => (
              <li key={item} className="flex items-center gap-3 py-1">
                <Check className="w-4 h-4 text-[#D4A853] shrink-0 mt-0.5" />
                <span className="text-zinc-300 text-sm leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="gold-divider" />

      {/* ── Pricing ── */}
      <section id="pricing" className="px-6 py-24">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="label-xs text-gold/70 mb-4">Transparent Pricing</p>
            <h2 className="font-cinzel text-3xl md:text-4xl font-bold tracking-wide">
              Simple pricing. No surprises.
            </h2>
            {/* Fix 5: transaction fee line removed */}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`border p-8 flex flex-col relative transition-all ${
                  p.highlight
                    ? "border-gold/45 bg-zinc-900/60"
                    : "border-white/[0.08] bg-zinc-900/25"
                }`}
              >
                {/* Fix 6: "Most Popular" → "Recommended" */}
                {p.highlight && (
                  <span className="label-xs text-black bg-gold px-4 py-1.5 absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    Recommended
                  </span>
                )}
                <div className="mb-8 mt-3">
                  <h3 className="font-cinzel text-xl font-bold tracking-wide mb-1">{p.name}</h3>
                  <p className="label-xs text-zinc-600 mb-5">{p.artists}</p>
                  <div className="flex items-end gap-1">
                    <span className="font-cinzel text-4xl font-black text-gold">{p.price}</span>
                    <span className="text-zinc-500 mb-1 text-sm">/mo</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-10 flex-1">
                  {p.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5">
                      <span className="text-[#DC2626] text-xs mt-0.5 shrink-0 font-bold">✓</span>
                      <span className="text-zinc-400 text-xs">{feat}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`text-center py-3.5 label-sm transition-all ${
                    p.highlight
                      ? "bg-[#DC2626] text-white hover:bg-[#b91c1c]"
                      : p.name === "Pro"
                      ? "bg-amber-600 hover:bg-amber-700 text-white rounded-md"
                      : "border border-white/20 text-zinc-400 hover:border-white/40 hover:text-white"
                  }`}
                >
                  Start Free Trial
                </Link>
                <p className="text-xs text-gray-500 text-center mt-2">
                  14-day free trial · No credit card required
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="gold-divider" />

      {/* ── Final CTA ── */}
      <section className="grain relative px-6 py-28 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_50%_50%,rgba(220,38,38,0.05),transparent)] pointer-events-none" />
        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="font-cinzel text-4xl md:text-5xl font-bold tracking-wide mb-5 text-balance">
            Ready to stop losing money<br />to no-shows?
          </h2>
          {/* Fix 12: updated CTA copy */}
          <p className="text-zinc-500 mb-12 leading-relaxed">
            Early studios get priority onboarding and locked-in pricing.
          </p>
          <Link
            href="/register"
            className="label-sm inline-block bg-[#DC2626] text-white px-12 py-5 hover:bg-[#b91c1c] transition-colors"
          >
            Start Your Free Trial Today →
          </Link>
          <p className="label-xs text-zinc-700 mt-6">14-day free trial · No credit card required</p>
        </div>
      </section>

      <div className="gold-divider" />

      {/* ── Footer ── */}
      <footer className="px-6 py-10 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 border border-gold/35 flex items-center justify-center">
              <span className="font-cinzel text-gold text-[9px] font-bold">IB</span>
            </div>
            <span className="font-cinzel text-sm tracking-wider text-zinc-500">InkBook</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="label-xs text-zinc-700 hover:text-zinc-400 transition-colors">Privacy</Link>
            <Link href="/terms" className="label-xs text-zinc-700 hover:text-zinc-400 transition-colors">Terms</Link>
            {/* Fix 20: Twitter/X icon link */}
            <a
              href="https://x.com/inkbook_tech"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow InkBook on X"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
          </div>
          {/* Fix 19: "Proudly serving USA & Canada" */}
          <p className="label-xs text-zinc-700">© 2026 InkBook · Proudly serving USA & Canada</p>
        </div>
      </footer>

    </div>
  );
}
