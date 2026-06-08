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
        className="text-[#64748B] hover:text-[#0F172A] transition-colors p-1.5"
        aria-label="Open menu"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-[#E5E7EB] shadow-lg z-50 py-1.5">
          <a href="#how-it-works" onClick={() => setOpen(false)} className="block px-5 py-2.5 text-sm text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-colors">
            How It Works
          </a>
          <a href="#ai-assistant" onClick={() => setOpen(false)} className="block px-5 py-2.5 text-sm text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-colors">
            AI Assistant
          </a>
          <a href="#dashboard" onClick={() => setOpen(false)} className="block px-5 py-2.5 text-sm text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-colors">
            Dashboard
          </a>
          <a href="#pricing" onClick={() => setOpen(false)} className="block px-5 py-2.5 text-sm text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-colors">
            Pricing
          </a>
          <div className="border-t border-[#F3F4F6] mt-1.5 pt-1.5">
            <Link href="/login" onClick={() => setOpen(false)} className="block px-5 py-2.5 text-sm text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-colors">
              Sign in
            </Link>
            <Link href="/book/demo-studio" onClick={() => setOpen(false)} className="block px-5 py-2.5 text-sm text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-colors">
              Book demo
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
