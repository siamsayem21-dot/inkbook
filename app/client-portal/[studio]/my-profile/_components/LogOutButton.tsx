"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  studioSlug: string;
}

// Same sign-out call as PortalHeader.tsx's account menu — reused here as the
// page's own clearly-separated primary Log Out action.
export default function LogOutButton({ studioSlug }: Props) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(`/book/${studioSlug}`);
    router.refresh();
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 flex items-center justify-between gap-4 flex-wrap">
      <div>
        <p className="text-sm font-medium text-zinc-800">Sign out of InkBook</p>
        <p className="text-xs text-zinc-400 mt-0.5">You&apos;ll need to verify your email again to sign back in.</p>
      </div>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        className="inline-flex items-center gap-2 text-sm font-semibold rounded-xl px-5 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 shrink-0"
      >
        <LogOut size={15} />
        {signingOut ? "Signing Out…" : "Log Out"}
      </button>
    </div>
  );
}
