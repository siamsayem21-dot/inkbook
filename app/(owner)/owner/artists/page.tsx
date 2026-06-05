export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/admin";
import ArtistsClient, { type Artist } from "./ArtistsClient";

const STUDIO_ID = "5fe382a1-fee7-4387-b625-4bf7a52b8f45";

type InviteRow = { id: string; invited_name: string; invited_email: string; created_at: string };

export default async function ArtistsPage() {
  const supabase = createAdminClient();

  const { data: artistsRaw } = await supabase
    .from("artists")
    .select("id, user_id, name, email, is_active, created_at")
    .eq("studio_id", STUDIO_ID)
    .order("name");

  const { data: invitesRaw } = await supabase
    .from("artist_invites")
    .select("id, invited_name, invited_email, created_at")
    .eq("studio_id", STUDIO_ID)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at");

  const invites = (invitesRaw ?? []) as InviteRow[];

  const pendingRows: Artist[] = invites.map((inv) => ({
    id: inv.id,
    invite_id: inv.id,
    user_id: null,
    name: inv.invited_name,
    email: inv.invited_email,
    created_at: inv.created_at,
    is_active: false,
  }));

  const allRows: Artist[] = [...((artistsRaw ?? []) as Artist[]), ...pendingRows];

  return (
    <ArtistsClient
      artists={allRows}
      studioId={STUDIO_ID}
    />
  );
}
