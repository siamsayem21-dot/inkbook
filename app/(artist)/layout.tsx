import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/config";
import Sidebar from "@/components/shared/Sidebar";

export default async function ArtistLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-[#FAF9FC] text-zinc-900 flex">
      <Sidebar role="artist" />
      <main className="flex-1 p-4 pt-16 md:p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
