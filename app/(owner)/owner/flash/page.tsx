export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getStudioId } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";
import FlashOwnerClient, { type FlashDesign } from "./FlashOwnerClient";

export default async function OwnerFlashPage() {
  const studioId = await getStudioId();
  if (!studioId) redirect("/login");

  const supabase = createAdminClient();

  const { data: designsRaw } = await supabase
    .from("flash_designs")
    .select("id, artist_id, title, image_url, price, category, is_repeatable, is_available, is_booked, created_at")
    .eq("studio_id", studioId)
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
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Flash Designs</h1>
          <span className="text-xs font-medium bg-violet-50 text-violet-700 rounded-full px-2.5 py-1">
            {designs.length}
          </span>
        </div>
        <p className="text-sm text-zinc-500 -mt-4">
          All flash designs across your studio. Artists manage their own designs from their Flash page.
        </p>
        <FlashOwnerClient designs={designs} artistMap={artistMap} artists={allArtists} />
      </div>
    </div>
  );
}
