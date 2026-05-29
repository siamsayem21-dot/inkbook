"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { label: "Overview", href: "/dashboard" },
  { label: "Bookings", href: "/dashboard/bookings" },
  { label: "Artists", href: "/dashboard/artists" },
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
    <aside className="w-56 shrink-0 border-r border-white/10 flex flex-col py-6 px-3 bg-[#0D0D0D]">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 mb-8">
        <div className="w-7 h-7 rounded-lg bg-gold flex items-center justify-center shrink-0">
          <span className="text-black text-[10px] font-black">IB</span>
        </div>
        <span className="font-bold text-sm">InkBook</span>
      </div>

      {/* Studio */}
      <div className="px-3 mb-6">
        <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Studio</p>
        <p className="text-sm font-semibold truncate">{studioName}</p>
        {studioSubdomain && (
          <a
            href={`/book/${studioSubdomain}`}
            target="_blank"
            className="text-[11px] text-white/30 hover:text-gold transition-colors mt-0.5 inline-block"
          >
            /{studioSubdomain} ↗
          </a>
        )}
      </div>

      {/* Nav */}
      <nav className="space-y-0.5">
        {NAV.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-gold/10 text-gold font-medium"
                  : "text-white/40 hover:text-white hover:bg-white/5"
              }`}
            >
              {active && <span className="w-1 h-4 rounded-full bg-gold shrink-0" />}
              {!active && <span className="w-1 h-4 shrink-0" />}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="mt-auto pt-4 border-t border-white/10">
        <button
          onClick={handleSignOut}
          className="w-full text-left px-3 py-2 text-sm text-white/30 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
