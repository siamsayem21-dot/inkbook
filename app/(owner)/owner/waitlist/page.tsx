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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Waitlist</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Clients added when an artist is fully booked for the month. They&apos;re notified automatically once a slot opens.
        </p>
      </div>
      <WaitlistManager initialArtists={artists} initialEntries={entries} />
    </div>
  );
}
