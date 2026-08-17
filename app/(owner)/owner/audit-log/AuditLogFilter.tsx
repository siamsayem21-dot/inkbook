"use client";

import { useRouter } from "next/navigation";

export default function AuditLogFilter({
  actions,
  actionLabels,
  current,
}: {
  actions: string[];
  actionLabels: Record<string, string>;
  current: string;
}) {
  const router = useRouter();

  return (
    <select
      value={current}
      onChange={(e) => {
        const value = e.target.value;
        router.push(value ? `/owner/audit-log?action=${encodeURIComponent(value)}` : "/owner/audit-log");
      }}
      className="bg-white border border-zinc-200 text-zinc-700 text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-colors"
    >
      <option value="">All events</option>
      {actions.map((action) => (
        <option key={action} value={action}>
          {actionLabels[action] ?? action}
        </option>
      ))}
    </select>
  );
}
