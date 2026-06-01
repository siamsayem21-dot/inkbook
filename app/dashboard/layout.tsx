import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import DashboardSidebar from "./_components/DashboardSidebar";

export const dynamic = "force-dynamic";

const STUDIO_ID = "5fe382a1-fee7-4387-b625-4bf7a52b8f45";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Use getUser() (validates token with Supabase server) instead of
  // getCurrentUser() (uses getSession() which reads cookie without validation)
  const serverClient = createClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();
  const { data: studioRaw } = await supabase
    .from("studios")
    .select("name, subdomain")
    .eq("id", STUDIO_ID)
    .maybeSingle();

  const studio = studioRaw as { name: string; subdomain: string } | null;

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
