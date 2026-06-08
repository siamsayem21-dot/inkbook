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
        background: "rgba(10,10,10,0.88)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
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
            color: "#F5F5F5",
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
              className="hover:text-[#F5F5F5] transition-colors duration-150"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "14px",
                color: "#A0A0A0",
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
          className="hidden md:flex items-center hover:bg-[#1A1A1A] transition-colors duration-150"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "14px",
            color: "#F5F5F5",
            border: "1px solid #363636",
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
              color: "#F5F5F5",
              border: "1px solid #363636",
              padding: "8px 16px",
              borderRadius: "8px",
              textDecoration: "none",
            }}
          >
            Early Access
          </Link>
          <button
            onClick={() => setOpen(!open)}
            style={{ color: "#A0A0A0", background: "none", border: "none", cursor: "pointer", padding: "4px", fontSize: "13px" }}
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
            background: "rgba(10,10,10,0.97)",
            backdropFilter: "blur(20px)",
            borderTop: "1px solid rgba(255,255,255,0.06)",
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
                  color: "#A0A0A0",
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
