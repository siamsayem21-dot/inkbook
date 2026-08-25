"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { label: "Overview",      href: "/dashboard" },
  { label: "Bookings",      href: "/dashboard/bookings" },
  { label: "Artists",       href: "/dashboard/artists" },
  { label: "Consent Forms", href: "/dashboard/consent-forms" },
];

interface Props {
  studioName: string;
  studioSubdomain: string;
}

export default function DashboardSidebar({ studioName, studioSubdomain }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="w-56 shrink-0 border-r border-white/[0.06] flex flex-col py-6 bg-[#0D0D0D]">
      {/* Logo */}
      <div className="px-4 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 border border-gold/40 flex items-center justify-center shrink-0">
            <span className="font-serif text-gold text-[10px] font-bold">IB</span>
          </div>
          <span className="font-serif text-[13px] tracking-wider text-white">InkBook</span>
        </div>
      </div>

      {/* Studio */}
      <div className="px-4 mb-5">
        <p className="label-xs text-zinc-700 mb-2.5">Studio</p>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-gold/10 border border-gold/25 flex items-center justify-center shrink-0">
            <span className="font-serif text-gold text-[9px] font-bold">
              {studioName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-zinc-300 truncate">{studioName}</p>
            {studioSubdomain && (
              <a
                href={`/book/${studioSubdomain}`}
                target="_blank"
                className="text-[9px] uppercase tracking-[0.1em] text-zinc-600 hover:text-gold transition-colors mt-0.5 inline-block"
              >
                /{studioSubdomain} ↗
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col flex-1">
        {NAV.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`py-2 px-4 text-[10px] uppercase tracking-[0.13em] font-medium transition-all flex items-center ${
                active
                  ? "text-gold bg-gold/[0.07] border-l-2 border-gold pl-[calc(1rem-2px)]"
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-4 pt-4 border-t border-white/[0.06]">
        <button
          onClick={handleSignOut}
          className="w-full text-left py-1.5 text-[9px] uppercase tracking-[0.15em] text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
