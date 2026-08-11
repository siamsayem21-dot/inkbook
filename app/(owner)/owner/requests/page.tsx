export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getStudioId } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";
import OwnerRequestsClient, { type OwnerRequest } from "./RequestsClient";

export default async function OwnerRequestsPage() {
  const studioId = await getStudioId();
  if (!studioId) redirect("/login");

  const supabase = createAdminClient();

  const { data: reqsRaw, error: reqsError } = await supabase
    .from("custom_requests")
    .select(
      "id, artist_id, client_name, client_email, client_phone, style, placement, size, budget_range, " +
      "preferred_dates, design_description, reference_photos, status, quote_amount, deposit_amount, " +
      "artist_note, declined_reason, created_at"
    )
    .eq("studio_id", studioId)
    .order("created_at", { ascending: false });

  if (reqsError) console.error("[OwnerRequestsPage] query error:", reqsError.code, reqsError.message);

  const requests = (reqsRaw ?? []) as OwnerRequest[];

  // Full studio artist list (not just ones already linked to a request) —
  // needed so the approve flow can assign an artist to a request that was
  // submitted without one (client submission leaves artist_id null when no
  // preference was given; see app/book/[studio]/custom/actions.ts).
  const { data: allArtistsRaw } = await supabase
    .from("artists")
    .select("id, name")
    .eq("studio_id", studioId)
    .order("name");

  const allArtists = (allArtistsRaw ?? []) as { id: string; name: string }[];
  const artistMap = Object.fromEntries(allArtists.map((a) => [a.id, a.name]));

  return (
    <OwnerRequestsClient
      requests={requests}
      artistMap={artistMap}
      artists={allArtists}
    />
  );
}
