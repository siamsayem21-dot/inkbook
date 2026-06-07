"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const NAV = [
  { label: "Platform", href: "#platform" },
  { label: "Pricing", href: "#pricing" },
  { label: "Blog", href: "#" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[#090909]/85 backdrop-blur-xl border-b border-white/[0.06]"
          : ""
      }`}
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="h-14 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 border border-white/20 flex items-center justify-center group-hover:border-white/40 transition-colors duration-200">
              <span className="text-[9px] font-bold tracking-widest text-white">IB</span>
            </div>
            <span className="text-[13px] font-medium text-white tracking-tight">
              InkBook
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {NAV.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="text-[13px] text-zinc-500 hover:text-white transition-colors duration-200"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-5">
            <Link
              href="#"
              className="text-[13px] text-zinc-500 hover:text-white transition-colors duration-200"
            >
              Sign in
            </Link>
            <Link
              href="#"
              className="h-8 px-4 bg-white text-black text-[13px] font-medium hover:bg-zinc-100 transition-colors duration-200 flex items-center"
            >
              Start free trial
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden text-[13px] text-zinc-400 hover:text-white transition-colors"
            onClick={() => setOpen(!open)}
            aria-label="Toggle navigation"
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-white/[0.06] bg-[#090909]/95 backdrop-blur-xl">
          <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-5">
            {NAV.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="text-sm text-zinc-400 hover:text-white transition-colors"
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            ))}
            <div className="pt-5 border-t border-white/[0.06] flex flex-col gap-3">
              <Link href="#" className="text-sm text-zinc-500">
                Sign in
              </Link>
              <Link
                href="#"
                className="h-10 px-4 bg-white text-black text-sm font-medium hover:bg-zinc-100 transition-colors flex items-center justify-center"
              >
                Start free trial
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
