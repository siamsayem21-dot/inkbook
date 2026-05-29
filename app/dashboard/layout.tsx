import { redirect } from "next/navigation";
import { getCurrentUser, getUserRole } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";
import DashboardSidebar from "./_components/DashboardSidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const role = await getUserRole(user.id);
  if (role !== "owner") redirect("/login");

  const supabase = createAdminClient();
  const { data: studioData } = await supabase
    .from("studios")
    .select("name, subdomain")
    .eq("owner_id", user.id)
    .single();

  const studio = studioData as { name: string; subdomain: string } | null;

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
