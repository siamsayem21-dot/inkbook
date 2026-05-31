import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/auth/config";
import ArtistsClient, { type Artist } from "./ArtistsClient";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export default async function ArtistsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = adminClient();

  const { data: studios } = await supabase
    .from("studios")
    .select("id, name")
    .eq("owner_id", user.id)
    .limit(1);

  const studio = studios?.[0] ?? null;
  if (!studio) redirect("/onboarding");

  // Guard: artists should not access owner pages
  const { data: artistRows } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);

  if (artistRows && artistRows.length > 0) redirect("/artist/dashboard");

  // Fetch active/inactive artists for this studio
  const { data: artists } = await supabase
    .from("artists")
    .select("id, user_id, name, email, created_at, is_active")
    .eq("studio_id", studio.id)
    .order("name");

  // Fetch pending invites (not accepted, not expired)
  const { data: invites } = await supabase
    .from("artist_invites")
    .select("id, invited_name, invited_email, created_at")
    .eq("studio_id", studio.id)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at");

  // Map pending invites to the Artist shape so the existing UI works unchanged
  const pendingRows: Artist[] = (invites ?? []).map((inv) => ({
    id: inv.id,
    invite_id: inv.id,
    user_id: null,
    name: inv.invited_name,
    email: inv.invited_email,
    created_at: inv.created_at,
    is_active: false,
  }));

  const allRows: Artist[] = [...(artists ?? []) as Artist[], ...pendingRows];

  return (
    <ArtistsClient
      artists={allRows}
      studioId={studio.id}
    />
  );
}
