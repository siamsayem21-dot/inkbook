export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";
import RequestsClient, { type CRequest } from "./RequestsClient";

export default async function ArtistRequestsPage() {
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

  const { data: reqsRaw } = await supabase
    .from("custom_requests")
    .select(
      "id, client_name, client_email, client_phone, style, placement, size, budget_range, preferred_dates, design_description, reference_photos, status, quote_amount, deposit_amount, artist_note, declined_reason, created_at"
    )
    .eq("studio_id", artist.studio_id)
    .or(`artist_id.eq.${artist.id},artist_id.is.null`)
    .order("created_at", { ascending: false });

  const requests = (reqsRaw ?? []) as CRequest[];

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Custom Requests</h1>
        {pendingCount > 0 && (
          <span className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-full px-2.5 py-1">
            {pendingCount} pending
          </span>
        )}
      </div>
      <RequestsClient requests={requests} />
    </div>
  );
}
