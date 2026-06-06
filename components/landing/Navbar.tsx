"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import MobileNavMenu from "./MobileNavMenu";

const NAV_LINKS = [
  { href: "#how-it-works", label: "How It Works" },
  { href: "#ai-assistant", label: "AI Assistant" },
  { href: "#dashboard", label: "Dashboard" },
  { href: "#pricing", label: "Pricing" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-white/[0.07] bg-ink/95 backdrop-blur-md"
          : "border-b border-white/[0.04] bg-ink"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 border border-gold/50 flex items-center justify-center">
            <span className="font-cinzel text-gold text-[10px] font-bold tracking-wider">IB</span>
          </div>
          <span className="font-cinzel text-sm tracking-wider text-white">InkBook</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="label-xs text-zinc-500 hover:text-white transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="label-xs text-zinc-500 hover:text-white transition-colors hidden md:block"
          >
            Sign In
          </Link>
          <Link
            href="/book/demo-studio"
            className="label-xs border border-white/20 text-zinc-300 px-4 py-2 hover:border-white/40 hover:text-white transition-all hidden md:block"
          >
            Book Demo
          </Link>
          <Link
            href="/register"
            className="label-xs bg-[#DC2626] text-white px-5 py-2 hover:bg-[#b91c1c] transition-colors"
          >
            Start Free Trial
          </Link>
          <MobileNavMenu />
        </div>
      </div>
    </nav>
  );
}
