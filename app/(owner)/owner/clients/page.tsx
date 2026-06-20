import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioId } from "@/lib/auth/config";
import ClientsTable from "@/components/owner/ClientsTable";

export const dynamic = "force-dynamic";

type ClientRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  created_at: string;
};

export default async function ClientsPage() {
  const studioId = await getStudioId();
  if (!studioId) redirect("/login");

  const supabase = createAdminClient();

  const { data } = await supabase
    .from("clients")
    .select("id, full_name, email, phone, created_at")
    .eq("studio_id", studioId)
    .order("created_at", { ascending: false });

  const clients = (data ?? []) as ClientRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Clients</h1>
        <p className="text-sm text-zinc-500 mt-1">
          All clients who have booked with your studio.
        </p>
      </div>

      <ClientsTable clients={clients} />
    </div>
  );
}
