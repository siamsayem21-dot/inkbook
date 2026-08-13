export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getStudioId } from "@/lib/auth/config";
import WaitlistManager from "@/components/owner/WaitlistManager";
import { getWaitlistData } from "./actions";

export default async function WaitlistPage() {
  const studioId = await getStudioId();
  if (!studioId) redirect("/login");

  const { artists, entries } = await getWaitlistData();

  return (
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Waitlist</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Clients added when an artist is fully booked for the month. They&apos;re notified automatically once a slot opens.
          </p>
        </div>
        <WaitlistManager initialArtists={artists} initialEntries={entries} />
      </div>
    </div>
  );
}
