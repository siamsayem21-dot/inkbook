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

// Light/white InkBook shell — mirrors components/owner/OwnerSidebar.tsx and
// components/shared/Sidebar.tsx. The Client Portal keeps its per-studio dynamic
// `brandColor` for the active-nav accent (intentional white-label behavior)
// instead of the hardcoded violet the Owner/Artist portals use internally.
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
          className="mx-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors"
          style={active ? { color: brandColor, backgroundColor: `${brandColor}14` } : undefined}
        >
          <span className={active ? "" : "text-zinc-500 hover:text-zinc-900"}>{item.label}</span>
        </Link>
      );
    });
  }

  const sidebarContent = (onClose?: () => void) => (
    <>
      <div className="px-4 mb-6">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: brandColor }}
          >
            <span className="text-white text-[10px] font-bold">
              {studioName.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-[15px] font-extrabold text-zinc-900 tracking-tight truncate">{studioName}</span>
        </div>
        <span className="text-[9px] uppercase tracking-[0.18em] text-zinc-400 mt-1.5 block ml-[2.375rem]">
          Client Portal
        </span>
      </div>

      <div className="mx-4 py-2.5 mb-3 border-y border-zinc-100">
        <p className="text-[9px] uppercase tracking-widest text-zinc-400 mb-0.5">Signed in as</p>
        <p className="text-xs font-medium text-zinc-600 truncate">{clientEmail}</p>
      </div>

      <div className="flex-1 flex flex-col gap-0.5 mt-1 overflow-y-auto">{navLinks(onClose)}</div>

      <div className="px-4 pt-4 mt-4 border-t border-zinc-100">
        <button
          onClick={() => { onClose?.(); handleSignOut(); }}
          disabled={signingOut}
          className="w-full text-left py-1.5 text-xs text-zinc-400 hover:text-zinc-700 transition-colors disabled:opacity-50"
        >
          {signingOut ? "Signing Out…" : "Sign Out"}
        </button>
      </div>
    </>
  );

  return (
    <>
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-zinc-200 px-4 h-12 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ backgroundColor: brandColor }}
          >
            <span className="text-white text-[9px] font-bold">
              {studioName.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-sm font-extrabold text-zinc-900 truncate">{studioName}</span>
        </div>
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="text-zinc-500 hover:text-zinc-900 w-8 h-8 flex items-center justify-center"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <aside className="absolute top-12 left-0 bottom-0 w-64 bg-white border-r border-zinc-200 flex flex-col py-6 overflow-y-auto">
            {sidebarContent(() => setMobileOpen(false))}
          </aside>
        </div>
      )}

      <aside className="hidden md:flex w-56 shrink-0 bg-white border-r border-zinc-200 flex-col py-6">
        {sidebarContent()}
      </aside>
    </>
  );
}
