import { redirect } from "next/navigation";
import OwnerSidebar from "@/components/owner/OwnerSidebar";
import { getCurrentUser, getOwnerStudio } from "@/lib/auth/config";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // cache()-shared with every page's own getStudioId() call — resolves the
  // owner's studio from `studios` at most once per request instead of the
  // layout and the page each running the identical query separately.
  const { studio, error: studioError } = await getOwnerStudio();

  // Only redirect when we're certain there are 0 rows — not on query error,
  // or the user loops forever. /register + POST /api/studios is the single
  // studio-creation flow.
  if (!studioError && !studio) redirect("/register");

  // Gate on subscription status — canceled/unpaid studios cannot access the dashboard
  const BLOCKED = ["canceled", "unpaid"];
  if (studio?.subscription_status && BLOCKED.includes(studio.subscription_status)) {
    redirect("/pricing");
  }

  return (
    <div className="min-h-screen bg-[#FAF9FC] text-zinc-900 flex">
      <OwnerSidebar studioName={studio?.name ?? undefined} />
      <main className="flex-1 p-4 pt-16 md:p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
