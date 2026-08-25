"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { Menu, X } from "lucide-react";

// Light/white + soft-purple InkBook shell for the Owner Portal — mirrors the visual
// language already shipped in app/client-portal (white bg, violet-600 accents,
// rounded-xl active state). This is the Owner-only shell; the Artist Portal keeps
// using the legacy dark/gold components/shared/Sidebar.tsx, untouched.
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
  { label: "Audit Log",     href: "/owner/audit-log" },
  { label: "Knowledge",     href: "/owner/knowledge" },
  { label: "Settings",      href: "/owner/settings" },
];

interface Props {
  studioName?: string;
}

export default function OwnerSidebar({ studioName }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  function navLinks(onClose?: () => void) {
    return ownerNav.map((item) => {
      const active = pathname.startsWith(item.href);
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={onClose}
          className={`mx-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
            active
              ? "bg-violet-50 text-violet-700"
              : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
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
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
            <span className="text-white text-[10px] font-bold">IB</span>
          </div>
          <span className="text-[15px] font-extrabold text-zinc-900 tracking-tight">InkBook</span>
        </div>
        <span className="text-[9px] uppercase tracking-[0.18em] text-zinc-400 mt-1.5 block ml-[2.375rem]">
          Owner Portal
        </span>
      </div>

      {/* Studio name */}
      {studioName && (
        <div className="mx-4 py-2.5 mb-3 border-y border-zinc-100 flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-violet-50 flex items-center justify-center shrink-0">
            <span className="text-violet-700 text-[10px] font-bold">
              {studioName.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-xs font-medium text-zinc-600 truncate">{studioName}</span>
        </div>
      )}

      {/* Nav links */}
      <div className="flex-1 flex flex-col gap-0.5 mt-1 overflow-y-auto">
        {navLinks(onClose)}
      </div>

      {/* Sign out */}
      <div className="px-4 pt-4 mt-4 border-t border-zinc-100">
        <button
          onClick={() => { onClose?.(); handleSignOut(); }}
          className="w-full text-left py-1.5 text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-zinc-200 px-4 h-12 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-violet-600 flex items-center justify-center">
            <span className="text-white text-[9px] font-bold">IB</span>
          </div>
          <span className="text-sm font-extrabold text-zinc-900">InkBook</span>
        </div>
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="text-zinc-500 hover:text-zinc-900 w-8 h-8 flex items-center justify-center"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <aside className="absolute top-12 left-0 bottom-0 w-64 bg-white border-r border-zinc-200 flex flex-col py-6 overflow-y-auto">
            {sidebarContent(() => setMobileOpen(false))}
          </aside>
        </div>
      )}

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-56 shrink-0 bg-white border-r border-zinc-200 flex-col py-6">
        {sidebarContent()}
      </aside>
    </>
  );
}
