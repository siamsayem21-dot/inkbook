export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getStudioId } from "@/lib/auth/config";
import BlacklistManager from "@/components/owner/BlacklistManager";
import { getBlacklistEntries } from "./actions";

export default async function BlacklistPage() {
  const studioId = await getStudioId();
  if (!studioId) redirect("/login");

  const entries = await getBlacklistEntries();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Client Blacklist</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Blocked clients cannot book any artist at this studio, by booking form or custom request.
          {entries.length > 0 && (
            <span className="ml-2 text-zinc-600">
              {entries.length} {entries.length === 1 ? "client" : "clients"} blocked.
            </span>
          )}
        </p>
      </div>
      <BlacklistManager initialEntries={entries} />
    </div>
  );
}
