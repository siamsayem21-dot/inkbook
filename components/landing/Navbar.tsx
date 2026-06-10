"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const NAV_LINKS = [
  { label: "Product", href: "#product" },
  { label: "Pricing", href: "#pricing" },
  { label: "Studio", href: "#studio" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "64px",
        zIndex: 100,
        background: "rgba(255,255,255,0.94)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        borderBottom: "1px solid rgba(0,0,0,0.07)",
      }}
    >
      <div
        className="flex items-center justify-between h-full mx-auto"
        style={{ maxWidth: "1120px", padding: "0 40px" }}
      >
        {/* Wordmark */}
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "20px",
            color: "#111111",
            letterSpacing: "-0.02em",
            textDecoration: "none",
          }}
        >
          InkBook
        </Link>

        {/* Center nav — desktop */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="hover:text-[#111111] transition-colors duration-150"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "14px",
                color: "#525252",
                textDecoration: "none",
              }}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA */}
        <Link
          href="#"
          className="hidden md:flex items-center hover:bg-[#F0F0EE] transition-colors duration-150"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "14px",
            color: "#111111",
            border: "1px solid #D8D8D6",
            padding: "10px 20px",
            borderRadius: "8px",
            textDecoration: "none",
          }}
        >
          Get Early Access
        </Link>

        {/* Mobile: Early Access + menu toggle */}
        <div className="md:hidden flex items-center gap-3">
          <Link
            href="#"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "13px",
              color: "#111111",
              border: "1px solid #D8D8D6",
              padding: "8px 16px",
              borderRadius: "8px",
              textDecoration: "none",
            }}
          >
            Early Access
          </Link>
          <button
            onClick={() => setOpen(!open)}
            style={{ color: "#525252", background: "none", border: "none", cursor: "pointer", padding: "4px", fontSize: "13px" }}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div
          className="md:hidden"
          style={{
            background: "rgba(255,255,255,0.98)",
            backdropFilter: "blur(20px)",
            borderTop: "1px solid rgba(0,0,0,0.07)",
            padding: "32px 24px",
          }}
        >
          <nav className="flex flex-col gap-6">
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                onClick={() => setOpen(false)}
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "18px",
                  color: "#525252",
                  textDecoration: "none",
                }}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
