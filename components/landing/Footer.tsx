import Link from "next/link";

const LINKS = {
  Product: ["Platform", "Pricing", "How It Works", "Changelog"],
  Company: ["About", "Blog", "Careers", "Contact"],
  Legal: ["Privacy Policy", "Terms of Service", "Security"],
};

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-16">
          {/* Brand */}
          <div className="col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 border border-white/20 flex items-center justify-center">
                <span className="text-[9px] font-bold tracking-widest text-white">IB</span>
              </div>
              <span className="text-[13px] font-medium text-white">InkBook</span>
            </div>
            <p className="text-[13px] text-zinc-600 leading-relaxed max-w-[220px]">
              AI-powered studio management for tattoo studios across the USA & Canada.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(LINKS).map(([heading, items]) => (
            <div key={heading}>
              <h4 className="text-[11px] tracking-[0.14em] uppercase text-zinc-700 font-medium mb-4">
                {heading}
              </h4>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item}>
                    <Link
                      href="#"
                      className="text-[13px] text-zinc-600 hover:text-white transition-colors duration-200"
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="border-t border-white/[0.06] pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <span className="text-[12px] text-zinc-700">
            © 2026 InkBook · Built for USA & Canada
          </span>
          <span className="text-[12px] text-zinc-700">
            SOC 2 compliance in progress
          </span>
        </div>
      </div>
    </footer>
  );
}
