"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

export default function MobileNavMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="md:hidden relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-zinc-400 hover:text-white transition-colors p-1 text-xl leading-none"
        aria-label="Open menu"
      >
        ☰
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-white/[0.10] z-50 py-1">
          <a
            href="#features"
            onClick={() => setOpen(false)}
            className="block px-5 py-3 label-xs text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            onClick={() => setOpen(false)}
            className="block px-5 py-3 label-xs text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            How It Works
          </a>
          <a
            href="#pricing"
            onClick={() => setOpen(false)}
            className="block px-5 py-3 label-xs text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Pricing
          </a>
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="block px-5 py-3 label-xs text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Sign In
          </Link>
        </div>
      )}
    </div>
  );
}
