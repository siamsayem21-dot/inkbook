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

  // Get this user's studio
  const { data: studio } = await supabase
    .from("studios")
    .select("id, name")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!studio) redirect("/onboarding");

  // Guard: artists should not access owner pages
  const { data: artistCheck } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (artistCheck) redirect("/artist/dashboard");

  const { data: artists } = await supabase
    .from("artists")
    .select("id, user_id, name, email, created_at, is_active")
    .eq("studio_id", studio.id)
    .order("name");

  return (
    <ArtistsClient
      artists={(artists ?? []) as Artist[]}
      studioId={studio.id}
    />
  );
}
