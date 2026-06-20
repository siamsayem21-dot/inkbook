import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import DashboardSidebar from "./_components/DashboardSidebar";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // getUser() validates the token server-side (more secure than getSession())
  const serverClient = createClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();

  // Resolve studio from the authenticated user (owner or artist)
  let studioRaw = null;
  const { data: ownerStudio } = await supabase
    .from("studios")
    .select("name, subdomain")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (ownerStudio) {
    studioRaw = ownerStudio;
  } else {
    const { data: artistRow } = await supabase
      .from("artists")
      .select("studio_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (artistRow) {
      const { data: artistStudio } = await supabase
        .from("studios")
        .select("name, subdomain")
        .eq("id", (artistRow as { studio_id: string }).studio_id)
        .maybeSingle();
      studioRaw = artistStudio;
    }
  }

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
