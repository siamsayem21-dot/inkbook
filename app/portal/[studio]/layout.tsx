import { redirect, notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, ensureClientAccount } from "@/lib/auth/config";
import { getBrand } from "@/lib/brand";
import PortalSidebar from "./_components/PortalSidebar";

export const dynamic = "force-dynamic";

interface Props {
  children: React.ReactNode;
  params: { studio: string };
}

export default async function ClientPortalLayout({ children, params }: Props) {
  const supabase = createAdminClient();
  const { data: studioData } = await supabase
    .from("studios")
    .select("id, name, primary_color")
    .eq("subdomain", params.studio)
    .single();

  const studio = studioData as { id: string; name: string; primary_color: string | null } | null;
  if (!studio) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/book/${params.studio}/login`);

  const account = await ensureClientAccount();
  if (!account) redirect(`/book/${params.studio}/login`);

  const brand = getBrand(studio.primary_color ?? "#D4AF37");

  return (
    <div className="min-h-screen bg-[#FAF9FC] text-zinc-900 flex">
      <PortalSidebar
        studioSlug={params.studio}
        studioName={studio.name}
        clientEmail={account.email}
        brandColor={brand.full}
      />
      <main className="flex-1 p-4 pt-16 md:p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
