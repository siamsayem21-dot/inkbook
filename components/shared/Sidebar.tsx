"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

const ownerNav = [
  { label: "Dashboard",     href: "/owner/dashboard" },
  { label: "Artists",       href: "/owner/artists" },
  { label: "Bookings",      href: "/owner/bookings" },
  { label: "Clients",       href: "/owner/clients" },
  { label: "Revenue",       href: "/owner/revenue" },
  { label: "Blacklist",     href: "/owner/blacklist" },
  { label: "Consent Forms", href: "/dashboard/consent-forms" },
  { label: "Waitlist",      href: "/owner/waitlist" },
  { label: "Settings",      href: "/owner/settings" },
];

const artistNav = [
  { label: "Dashboard",   href: "/artist/dashboard" },
  { label: "Schedule",    href: "/artist/schedule" },
  { label: "Bookings",    href: "/artist/bookings" },
  { label: "Portfolio",   href: "/artist/portfolio" },
  { label: "Earnings",    href: "/artist/earnings" },
  { label: "Clients",     href: "/artist/clients" },
  { label: "Agreements",  href: "/artist/agreements" },
];

interface Props {
  role: "owner" | "artist";
}

export default function Sidebar({ role }: Props) {
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
          className={`px-3 py-2 rounded-lg text-sm transition-colors ${
            active
              ? "bg-zinc-800 text-white"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
          }`}
        >
          {item.label}
        </Link>
      );
    });
  }

  return (
    <>
      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-zinc-950 border-b border-zinc-800 px-4 h-12 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm">InkBook</span>
          <span className="text-xs text-zinc-500 capitalize">{role}</span>
        </div>
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="text-zinc-400 hover:text-white w-8 h-8 flex items-center justify-center text-lg leading-none"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* ── Mobile drawer overlay ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute top-12 left-0 bottom-0 w-56 bg-zinc-900 border-r border-zinc-800 flex flex-col pt-4 pb-6 px-4 gap-1 overflow-y-auto">
            {navLinks(() => setMobileOpen(false))}
            <div className="mt-auto pt-6 border-t border-zinc-800">
              <button
                onClick={() => { setMobileOpen(false); handleSignOut(); }}
                className="w-full text-left px-3 py-2 text-sm text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/50"
              >
                Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-56 shrink-0 border-r border-zinc-800 flex-col py-6 px-4 gap-1">
        <div className="px-2 mb-6">
          <span className="text-lg font-bold">InkBook</span>
          <span className="block text-xs text-zinc-500 capitalize mt-0.5">{role} portal</span>
        </div>
        {navLinks()}
        <div className="mt-auto pt-6 border-t border-zinc-800">
          <button
            onClick={handleSignOut}
            className="w-full text-left px-3 py-2 text-sm text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/50"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
