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
    .select("id, styles")
    .eq("user_id", user.id)
    .maybeSingle();

  const artist = artistRaw as { id: string; styles: string[] } | null;
  if (!artist) redirect("/artist/dashboard");

  const { data: photosRaw } = await supabase
    .from("portfolio_images")
    .select("id, image_url, style")
    .eq("artist_id", artist.id)
    .order("created_at", { ascending: false });

  const photos: Photo[] = ((photosRaw ?? []) as { id: string; image_url: string; style: string | null }[]).map(
    (p) => ({
      id: p.id,
      url: p.image_url,
      style: p.style,
    })
  );

  return (
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Portfolio</h1>
          <p className="text-sm text-zinc-500 mt-1">Your published work — shown on your studio&apos;s public booking page.</p>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5">
          <StyleSelector artistId={artist.id} initialStyles={artist.styles ?? []} />
        </div>

        <PortfolioClient artistId={artist.id} initialPhotos={photos} />
      </div>
    </div>
  );
}
