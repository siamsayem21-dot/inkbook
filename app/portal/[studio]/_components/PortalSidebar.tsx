"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { label: "Dashboard",        href: "dashboard" },
  { label: "AI Consultation",  href: "consultation" },
  { label: "Projects",         href: "projects" },
  { label: "Bookings",         href: "bookings" },
  { label: "History",          href: "history" },
  { label: "Messages",         href: "messages" },
  { label: "Settings",         href: "settings" },
];

interface Props {
  studioSlug: string;
  studioName: string;
  clientEmail: string;
  brandColor: string;
}

export default function PortalSidebar({ studioSlug, studioName, clientEmail, brandColor }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(`/book/${studioSlug}`);
    router.refresh();
  }

  function navLinks(onClose?: () => void) {
    return NAV.map((item) => {
      const href = `/portal/${studioSlug}/${item.href}`;
      const active = pathname.startsWith(href);
      return (
        <Link
          key={item.href}
          href={href}
          onClick={onClose}
          className="py-2 px-4 text-[10px] uppercase tracking-[0.13em] font-medium transition-all flex items-center"
          style={
            active
              ? { color: brandColor, backgroundColor: `${brandColor}12`, borderLeft: `2px solid ${brandColor}`, paddingLeft: "calc(1rem - 2px)" }
              : undefined
          }
        >
          <span className={active ? "" : "text-zinc-500 hover:text-zinc-200"}>{item.label}</span>
        </Link>
      );
    });
  }

  const sidebarContent = (onClose?: () => void) => (
    <>
      <div className="px-4 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 flex items-center justify-center shrink-0" style={{ border: `1px solid ${brandColor}66` }}>
            <span className="text-[10px] font-bold" style={{ color: brandColor }}>
              {studioName.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-[13px] tracking-wide text-white truncate">{studioName}</span>
        </div>
        <span className="text-[9px] uppercase tracking-[0.18em] text-zinc-600 mt-1.5 block ml-[2.375rem]">
          Client Portal
        </span>
      </div>

      <div className="mx-4 py-2.5 mb-3 border-y border-white/[0.06]">
        <p className="text-[9px] uppercase tracking-widest text-zinc-600 mb-0.5">Signed in as</p>
        <p className="text-xs font-medium text-zinc-300 truncate">{clientEmail}</p>
      </div>

      <div className="flex-1 flex flex-col mt-1">{navLinks(onClose)}</div>

      <div className="px-4 pt-4 mt-4 border-t border-white/[0.06]">
        <button
          onClick={() => { onClose?.(); handleSignOut(); }}
          disabled={signingOut}
          className="w-full text-left py-1.5 text-[9px] uppercase tracking-[0.15em] text-zinc-600 hover:text-zinc-400 transition-colors disabled:opacity-50"
        >
          {signingOut ? "Signing Out…" : "Sign Out"}
        </button>
      </div>
    </>
  );

  return (
    <>
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#0A0A0A] border-b border-white/[0.06] px-4 h-12 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 flex items-center justify-center" style={{ border: `1px solid ${brandColor}66` }}>
            <span className="text-[9px] font-bold" style={{ color: brandColor }}>
              {studioName.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-[13px] tracking-wide">{studioName}</span>
        </div>
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="text-zinc-400 hover:text-white w-8 h-8 flex items-center justify-center"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMobileOpen(false)} />
          <aside className="absolute top-12 left-0 bottom-0 w-56 bg-[#0d0d0d] border-r border-white/[0.06] flex flex-col py-6 overflow-y-auto">
            {sidebarContent(() => setMobileOpen(false))}
          </aside>
        </div>
      )}

      <aside className="hidden md:flex w-56 shrink-0 bg-[#0d0d0d] border-r border-white/[0.06] flex-col py-6">
        {sidebarContent()}
      </aside>
    </>
  );
}
