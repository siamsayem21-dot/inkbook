export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getStudioId } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";
import OwnerRequestsClient, { type OwnerRequest } from "./RequestsClient";

export default async function OwnerRequestsPage() {
  const studioId = await getStudioId();
  if (!studioId) redirect("/login");

  const supabase = createAdminClient();

  const { data: reqsRaw } = await supabase
    .from("custom_requests")
    .select(
      "id, artist_id, client_name, client_email, client_phone, style, placement, size, budget_range, preferred_dates, design_description, reference_photos, status, quote_amount, deposit_amount, artist_note, declined_reason, created_at"
    )
    .eq("studio_id", studioId)
    .order("created_at", { ascending: false });

  const requests = (reqsRaw ?? []) as OwnerRequest[];

  const artistIds = Array.from(new Set(requests.map((r) => r.artist_id).filter(Boolean))) as string[];
  const { data: artistsRaw } = artistIds.length
    ? await supabase.from("artists").select("id, name").in("id", artistIds)
    : { data: [] };

  const allArtists = (artistsRaw ?? []) as { id: string; name: string }[];
  const artistMap = Object.fromEntries(allArtists.map((a) => [a.id, a.name]));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Custom Requests</h1>
        <span className="text-xs bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/20 rounded-full px-2.5 py-1">
          {requests.length}
        </span>
      </div>
      <OwnerRequestsClient
        requests={requests}
        artistMap={artistMap}
        artists={allArtists}
      />
    </div>
  );
}
