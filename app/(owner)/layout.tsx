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
  // .limit(1) instead of .maybeSingle() — maybeSingle() returns null when >1 rows exist
  const { data: studios } = await supabase
    .from("studios")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1);

  // No studio yet — send them through onboarding first
  if (!studios || studios.length === 0) redirect("/onboarding");

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">
      <Sidebar role="owner" />
      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
