export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";
import FlashClient, { type FlashDesign } from "./FlashClient";

export default async function ArtistFlashPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();

  const { data: artistRaw } = await supabase
    .from("artists")
    .select("id, studio_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const artist = artistRaw as { id: string; studio_id: string } | null;
  if (!artist) redirect("/artist/dashboard");

  const { data: designsRaw } = await supabase
    .from("flash_designs")
    .select("id, title, description, image_url, price, category, is_repeatable, is_available, is_booked, created_at")
    .eq("artist_id", artist.id)
    .order("created_at", { ascending: false });

  const designs = (designsRaw ?? []) as FlashDesign[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Flash Designs</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Ready-made designs clients can book directly — no approval needed.
        </p>
      </div>
      <FlashClient artistId={artist.id} studioId={artist.studio_id} initialDesigns={designs} />
    </div>
  );
}
