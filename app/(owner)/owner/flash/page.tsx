export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";
import FlashOwnerClient, { type FlashDesign } from "./FlashOwnerClient";

const STUDIO_ID = "5fe382a1-fee7-4387-b625-4bf7a52b8f45";

export default async function OwnerFlashPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();

  const { data: designsRaw } = await supabase
    .from("flash_designs")
    .select("id, artist_id, title, image_url, price, category, is_repeatable, is_available, is_booked, created_at")
    .eq("studio_id", STUDIO_ID)
    .order("created_at", { ascending: false });

  const designs = (designsRaw ?? []) as FlashDesign[];

  // Fetch artist names for filter + display
  const artistIds = Array.from(new Set(designs.map((d) => d.artist_id)));
  const { data: artistsRaw } = artistIds.length
    ? await supabase.from("artists").select("id, name").in("id", artistIds)
    : { data: [] };

  const allArtists = (artistsRaw ?? []) as { id: string; name: string }[];
  const artistMap = Object.fromEntries(allArtists.map((a) => [a.id, a.name]));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Flash Designs</h1>
        <span className="text-xs bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/20 rounded-full px-2.5 py-1">
          {designs.length}
        </span>
      </div>
      <p className="text-zinc-500 text-sm -mt-4">
        All flash designs across your studio. Artists manage their own designs from their Flash page.
      </p>
      <FlashOwnerClient designs={designs} artistMap={artistMap} artists={allArtists} />
    </div>
  );
}
