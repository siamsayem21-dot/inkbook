import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Sidebar from "@/components/shared/Sidebar";
import { getCurrentUser } from "@/lib/auth/config";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = adminClient();
  const { data: studios, error: studioError } = await supabase
    .from("studios")
    .select("id, subscription_status, name")
    .eq("owner_id", user.id)
    .limit(1);

  if (studioError) {
    // Log the real error — don't redirect on query failure or the user loops forever
    console.error("[OwnerLayout] studio query failed:", studioError.message, "| user:", user.id);
  }

  // Only redirect when we're certain there are 0 rows — not on query error
  if (!studioError && (!studios || studios.length === 0)) redirect("/onboarding");

  // Gate on subscription status — canceled/unpaid studios cannot access the dashboard
  const studio = studios?.[0] as { id: string; subscription_status?: string; name?: string } | undefined;
  const BLOCKED = ["canceled", "unpaid"];
  if (studio?.subscription_status && BLOCKED.includes(studio.subscription_status)) {
    redirect("/pricing");
  }

  return (
    <div className="min-h-screen bg-ink text-white flex">
      <Sidebar role="owner" studioName={studio?.name} />
      <main className="flex-1 p-4 pt-16 md:p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
