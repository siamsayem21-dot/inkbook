"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

const ownerNav = [
  { label: "Dashboard",     href: "/owner/dashboard" },
  { label: "Consultations", href: "/owner/consultations" },
  { label: "Pipeline",      href: "/owner/pipeline" },
  { label: "Artists",       href: "/owner/artists" },
  { label: "Bookings",      href: "/owner/bookings" },
  { label: "Requests",      href: "/owner/requests" },
  { label: "Messages",      href: "/owner/messages" },
  { label: "Flash",          href: "/owner/flash" },
  { label: "Clients",       href: "/owner/clients" },
  { label: "Revenue",       href: "/owner/revenue" },
  { label: "Reviews",       href: "/owner/reviews" },
  { label: "Blacklist",     href: "/owner/blacklist" },
  { label: "Consent Forms", href: "/owner/consent-forms" },
  { label: "Waitlist",      href: "/owner/waitlist" },
  { label: "Knowledge",     href: "/owner/knowledge" },
  { label: "Settings",      href: "/owner/settings" },
];

const artistNav = [
  { label: "Dashboard",   href: "/artist/dashboard" },
  { label: "Schedule",    href: "/artist/schedule" },
  { label: "Bookings",    href: "/artist/bookings" },
  { label: "Requests",    href: "/artist/requests" },
  { label: "Messages",    href: "/artist/messages" },
  { label: "Portfolio",   href: "/artist/portfolio" },
  { label: "Flash",       href: "/artist/flash" },
  { label: "Earnings",    href: "/artist/earnings" },
  { label: "Clients",     href: "/artist/clients" },
  { label: "Agreements",  href: "/artist/agreements" },
];

interface Props {
  role: "owner" | "artist";
  studioName?: string;
}

export default function Sidebar({ role, studioName }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const nav = role === "owner" ? ownerNav : artistNav;
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  function navLinks(onClose?: () => void) {
    return nav.map((item) => {
      const active = pathname.startsWith(item.href);
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={onClose}
          className={`py-2 px-4 text-[10px] uppercase tracking-[0.13em] font-medium transition-all flex items-center ${
            active
              ? "text-gold bg-gold/[0.07] border-l-2 border-gold pl-[calc(1rem-2px)]"
              : "text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]"
          }`}
        >
          {item.label}
        </Link>
      );
    });
  }

  const sidebarContent = (onClose?: () => void) => (
    <>
      {/* Logo */}
      <div className="px-4 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 border border-gold/40 flex items-center justify-center shrink-0">
            <span className="font-cinzel text-gold text-[10px] font-bold">IB</span>
          </div>
          <span className="font-cinzel text-[13px] tracking-wider text-white">InkBook</span>
        </div>
        <span className="text-[9px] uppercase tracking-[0.18em] text-zinc-600 mt-1.5 block ml-[2.375rem]">
          {role} Portal
        </span>
      </div>

      {/* Studio name */}
      {studioName && (
        <div className="mx-4 py-2.5 mb-3 border-y border-white/[0.06] flex items-center gap-2.5">
          <div className="w-6 h-6 bg-gold/10 border border-gold/25 flex items-center justify-center shrink-0">
            <span className="font-cinzel text-gold text-[9px] font-bold">
              {studioName.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-xs font-medium text-zinc-300 truncate">{studioName}</span>
        </div>
      )}

      {/* Nav links */}
      <div className="flex-1 flex flex-col mt-1">
        {navLinks(onClose)}
      </div>

      {/* Sign out */}
      <div className="px-4 pt-4 mt-4 border-t border-white/[0.06]">
        <button
          onClick={() => { onClose?.(); handleSignOut(); }}
          className="w-full text-left py-1.5 text-[9px] uppercase tracking-[0.15em] text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-ink border-b border-white/[0.06] px-4 h-12 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border border-gold/40 flex items-center justify-center">
            <span className="font-cinzel text-gold text-[9px] font-bold">IB</span>
          </div>
          <span className="font-cinzel text-[13px] tracking-wider">InkBook</span>
        </div>
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="text-zinc-400 hover:text-white w-8 h-8 flex items-center justify-center"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMobileOpen(false)} />
          <aside className="absolute top-12 left-0 bottom-0 w-56 bg-[#0d0d0d] border-r border-white/[0.06] flex flex-col py-6 overflow-y-auto">
            {sidebarContent(() => setMobileOpen(false))}
          </aside>
        </div>
      )}

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-56 shrink-0 bg-[#0d0d0d] border-r border-white/[0.06] flex-col py-6">
        {sidebarContent()}
      </aside>
    </>
  );
}
