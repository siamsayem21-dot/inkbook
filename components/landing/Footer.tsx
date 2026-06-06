import Link from "next/link";

const FOOTER_LINKS = {
  Product: [
    { label: "How It Works", href: "#how-it-works" },
    { label: "AI Assistant", href: "#ai-assistant" },
    { label: "Dashboard", href: "#dashboard" },
    { label: "Pricing", href: "#pricing" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Careers", href: "/careers" },
    { label: "Contact", href: "/contact" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Security", href: "/security" },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06] px-6 pt-16 pb-10">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-7 h-7 border border-gold/40 flex items-center justify-center">
                <span className="font-cinzel text-gold text-[9px] font-bold">IB</span>
              </div>
              <span className="font-cinzel text-sm tracking-wider text-white">InkBook</span>
            </div>
            <p className="text-zinc-600 text-xs leading-relaxed max-w-[200px]">
              AI-powered studio management for tattoo studios across the USA & Canada.
            </p>
            <div className="flex items-center gap-4 mt-6">
              <a
                href="https://x.com/inkbook_tech"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow InkBook on X"
                className="text-zinc-700 hover:text-white transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
            </div>
          </div>

          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <p className="label-xs text-zinc-600 mb-4">{category}</p>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-xs text-zinc-500 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="label-xs text-zinc-700">© 2026 InkBook · Proudly serving USA & Canada</p>
          <p className="label-xs text-zinc-700">SOC 2 compliance in progress</p>
        </div>
      </div>
    </footer>
  );
}
