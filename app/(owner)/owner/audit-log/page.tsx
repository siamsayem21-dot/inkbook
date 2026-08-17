export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getStudioId } from "@/lib/auth/config";
import { getAuditLogEntries } from "./actions";
import AuditLogFilter from "./AuditLogFilter";
import AuditLogPagination from "./AuditLogPagination";

const ACTION_LABELS: Record<string, string> = {
  "blacklist.added": "Client blocked",
  "blacklist.removed": "Client unblocked",
  "booking.cancelled": "Booking cancelled",
  "booking.no_show": "Booking marked no-show",
  "consent_form.signed": "Consent form signed",
};

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

const ACTOR_BADGE: Record<string, string> = {
  owner: "bg-violet-50 text-violet-700 border-violet-200",
  artist: "bg-blue-50 text-blue-700 border-blue-200",
  client: "bg-emerald-50 text-emerald-700 border-emerald-200",
  system: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: { action?: string; page?: string };
}) {
  const studioId = await getStudioId();
  if (!studioId) redirect("/login");

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const { entries, total, actions } = await getAuditLogEntries({
    action: searchParams.action || undefined,
    page,
  });
  const pageSize = 50;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Audit Log</h1>
            <p className="text-sm text-zinc-500 mt-1">
              A permanent, read-only record of compliance-relevant events — consent forms signed, clients
              blocked/unblocked, bookings cancelled or marked no-show. Nothing here can be edited or deleted.
            </p>
          </div>
          <AuditLogFilter actions={actions} actionLabels={ACTION_LABELS} current={searchParams.action ?? ""} />
        </div>

        {entries.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm px-6 py-16 text-center">
            <p className="text-base font-semibold text-zinc-900 mb-2">No events yet</p>
            <p className="text-zinc-500 text-sm">
              {searchParams.action
                ? "No events match this filter."
                : "Compliance events will appear here as they happen — consent forms signed, clients blocked, bookings cancelled."}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 text-left text-xs text-zinc-400 uppercase tracking-wide">
                    <th className="px-5 py-3 font-medium">Event</th>
                    <th className="px-5 py-3 font-medium">Actor</th>
                    <th className="px-5 py-3 font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-b border-zinc-50 last:border-0">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-zinc-900">
                          {ACTION_LABELS[entry.action] ?? entry.action}
                        </p>
                        {entry.entityType && (
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {entry.entityType}
                            {entry.entityId ? ` · ${entry.entityId.slice(0, 8)}` : ""}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${
                            ACTOR_BADGE[entry.actorType] ?? ACTOR_BADGE.system
                          }`}
                        >
                          {entry.actorLabel}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-zinc-500">{fmtDateTime(entry.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {totalPages > 1 && (
          <AuditLogPagination page={page} totalPages={totalPages} action={searchParams.action ?? ""} />
        )}
      </div>
    </div>
  );
}
