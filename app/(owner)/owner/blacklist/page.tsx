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
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Client Blacklist</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Blocked clients cannot book any artist at this studio, by booking form or custom request.
            {entries.length > 0 && (
              <span className="ml-2 text-red-600 font-medium">
                {entries.length} {entries.length === 1 ? "client" : "clients"} blocked.
              </span>
            )}
          </p>
        </div>
        <BlacklistManager initialEntries={entries} />
      </div>
    </div>
  );
}
