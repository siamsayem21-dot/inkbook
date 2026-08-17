"use client";

import Link from "next/link";

function hrefFor(page: number, action: string) {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (action) params.set("action", action);
  const qs = params.toString();
  return `/owner/audit-log${qs ? `?${qs}` : ""}`;
}

export default function AuditLogPagination({
  page,
  totalPages,
  action,
}: {
  page: number;
  totalPages: number;
  action: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <Link
        href={hrefFor(page - 1, action)}
        aria-disabled={page <= 1}
        className={`px-4 py-2 rounded-xl border border-zinc-200 bg-white transition-colors ${
          page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-zinc-50 text-zinc-700"
        }`}
      >
        Previous
      </Link>
      <span className="text-zinc-400">
        Page {page} of {totalPages}
      </span>
      <Link
        href={hrefFor(page + 1, action)}
        aria-disabled={page >= totalPages}
        className={`px-4 py-2 rounded-xl border border-zinc-200 bg-white transition-colors ${
          page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-zinc-50 text-zinc-700"
        }`}
      >
        Next
      </Link>
    </div>
  );
}
