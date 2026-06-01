"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const ownerNav = [
  { label: "Dashboard", href: "/owner/dashboard" },
  { label: "Artists", href: "/owner/artists" },
  { label: "Bookings", href: "/owner/bookings" },
  { label: "Revenue", href: "/owner/revenue" },
  { label: "Blacklist", href: "/owner/blacklist" },
  { label: "Consent Forms", href: "/dashboard/consent-forms" },
  { label: "Waitlist", href: "/owner/waitlist" },
  { label: "Settings", href: "/owner/settings" },
];

const artistNav = [
  { label: "Dashboard", href: "/artist/dashboard" },
  { label: "Schedule", href: "/artist/schedule" },
  { label: "Bookings", href: "/artist/bookings" },
  { label: "Portfolio", href: "/artist/portfolio" },
  { label: "Earnings", href: "/artist/earnings" },
  { label: "Clients", href: "/artist/clients" },
  { label: "Agreements", href: "/artist/agreements" },
];

interface Props {
  role: "owner" | "artist";
}

export default function Sidebar({ role }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const nav = role === "owner" ? ownerNav : artistNav;

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <aside className="w-56 shrink-0 border-r border-zinc-800 flex flex-col py-6 px-4 gap-1">
      <div className="px-2 mb-6">
        <span className="text-lg font-bold">InkBook</span>
        <span className="block text-xs text-zinc-500 capitalize mt-0.5">{role} portal</span>
      </div>
      {nav.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              active
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
      <div className="mt-auto pt-6 border-t border-zinc-800">
        <button
          onClick={handleSignOut}
          className="w-full text-left px-3 py-2 text-sm text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/50"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
