export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";

// Smart redirect hub — login sends everyone here, we route by role.
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();

  // Owner: has a studio with owner_id = this user
  const { data: studios } = await supabase
    .from("studios")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1);

  if (studios && studios.length > 0) redirect("/owner/dashboard");

  // Artist: has a row in artists table with user_id = this user
  const { data: artists } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);

  if (artists && artists.length > 0) redirect("/artist/dashboard");

  // New user — no studio, no artist profile yet
  redirect("/onboarding");
}
