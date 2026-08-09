"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronDown, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  studioSlug: string;
  studioName: string;
  clientEmail: string;
  clientName?: string | null;
}

const NAV = [
  { label: "Home", href: "home", enabled: true },
  { label: "My Tattoos", href: "my-tattoos", enabled: true },
  { label: "My Profile", href: "my-profile", enabled: true },
  { label: "Studio", href: "studio", enabled: true },
];

function initials(nameOrEmail: string): string {
  const base = nameOrEmail.includes("@") ? nameOrEmail.split("@")[0] : nameOrEmail;
  const parts = base.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
}

export default function PortalHeader({ studioSlug, studioName, clientEmail, clientName }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const displayName = clientName || clientEmail.split("@")[0];
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(`/book/${studioSlug}`);
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-zinc-200/80">
      <div className="max-w-[1640px] mx-auto px-4 sm:px-6 lg:px-8 h-[68px] flex items-center justify-between gap-8">
        <div className="flex items-center gap-10 min-w-0">
          <Link href={`/client-portal/${studioSlug}/home`} className="flex items-center gap-2.5 shrink-0">
            <span className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M6 1L11 10.5H1L6 1Z" fill="white" />
              </svg>
            </span>
            <span className="text-lg font-extrabold uppercase tracking-tight text-zinc-900">InkBook</span>
          </Link>

          <nav className="hidden md:flex items-center gap-7">
            {NAV.map((item) => {
              const href = `/client-portal/${studioSlug}/${item.href}`;
              const active = pathname === href || (item.href === "home" && pathname?.startsWith(href));
              if (!item.enabled) {
                return (
                  <span
                    key={item.href}
                    title="Coming soon"
                    className="text-sm font-medium text-zinc-300 cursor-not-allowed select-none"
                  >
                    {item.label}
                  </span>
                );
              }
              return (
                <Link
                  key={item.href}
                  href={href}
                  className={`text-sm font-medium pb-[24px] mt-[24px] border-b-2 transition-colors ${
                    active
                      ? "text-violet-600 border-violet-600"
                      : "text-zinc-500 border-transparent hover:text-zinc-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            aria-label="Notifications"
            className="relative w-9 h-9 rounded-full flex items-center justify-center text-zinc-500 hover:bg-zinc-100 transition-colors"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-violet-600 ring-2 ring-white" />
          </button>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-zinc-100 transition-colors"
            >
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-white text-xs font-semibold flex items-center justify-center">
                {initials(displayName)}
              </span>
              <span className="hidden sm:block text-sm font-medium text-zinc-800 max-w-[120px] truncate">
                {displayName}
              </span>
              <ChevronDown size={14} className="hidden sm:block text-zinc-400" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-zinc-200 shadow-lg py-1.5 overflow-hidden">
                <div className="px-3.5 py-2 border-b border-zinc-100">
                  <p className="text-xs text-zinc-400">Signed in to</p>
                  <p className="text-sm font-medium text-zinc-800 truncate">{studioName}</p>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="w-full flex items-center gap-2 px-3.5 py-2 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
                >
                  <LogOut size={14} />
                  {signingOut ? "Signing out…" : "Sign out"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
