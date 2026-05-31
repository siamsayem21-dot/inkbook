import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";
import StyleSelector from "@/components/artist/StyleSelector";
import PortfolioClient, { type Photo } from "./PortfolioClient";

export default async function PortfolioPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();

  const { data: artistRaw } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const artist = artistRaw as { id: string } | null;
  if (!artist) redirect("/artist/dashboard");

  const { data: photosRaw } = await supabase
    .from("portfolio_photos" as never)
    .select("id, storage_path, style")
    .eq("artist_id" as never, artist.id)
    .order("created_at" as never, { ascending: false });

  const photos: Photo[] = ((photosRaw ?? []) as { id: string; storage_path: string; style: string | null }[]).map(
    (p) => ({
      id: p.id,
      storage_path: p.storage_path,
      style: p.style,
      url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portfolio/${p.storage_path}`,
    })
  );

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Portfolio</h1>
      <StyleSelector />
      <PortfolioClient artistId={artist.id} initialPhotos={photos} />
    </div>
  );
}
