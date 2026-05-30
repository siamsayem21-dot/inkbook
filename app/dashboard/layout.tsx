import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";
import DashboardSidebar from "./_components/DashboardSidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // .limit(1) — .single() returns null when multiple rows match
  const supabase = createAdminClient();
  const { data: studios } = await supabase
    .from("studios")
    .select("name, subdomain")
    .eq("owner_id", user.id)
    .limit(1);

  const studio = studios?.[0] as { name: string; subdomain: string } | undefined;

  return (
    <div className="min-h-screen bg-ink text-white flex">
      <DashboardSidebar
        studioName={studio?.name ?? "Your Studio"}
        studioSubdomain={studio?.subdomain ?? ""}
      />
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
