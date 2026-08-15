import Link from "next/link";

// Owner-only light/violet fork of components/messaging/ThreadList.tsx — see
// components/owner/OwnerSidebar.tsx for why this project forks rather than
// themes the shared dark component (Client Portal and Artist Portal keep
// using the original, untouched). Same props/behavior, visuals only.
export type ThreadListItem = {
  id: string;
  title: string;
  subtitle?: string;
  preview: string;
  updatedAt: string;
  unread: boolean;
};

interface Props {
  items: ThreadListItem[];
  basePath: string;
  emptyTitle: string;
  emptyDescription: string;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function OwnerThreadList({ items, basePath, emptyTitle, emptyDescription }: Props) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm px-6 py-16 text-center">
        <p className="text-base font-semibold text-zinc-900 mb-2">{emptyTitle}</p>
        <p className="text-zinc-500 text-sm leading-relaxed max-w-sm mx-auto">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <Link
          key={item.id}
          href={`${basePath}/${item.id}`}
          className="block bg-white rounded-2xl border border-zinc-200 shadow-sm hover:border-violet-200 transition-colors px-5 py-4 flex items-start gap-3"
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${item.unread ? "bg-violet-600" : "bg-transparent"}`}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className={`text-sm truncate ${item.unread ? "font-semibold text-zinc-900" : "font-medium text-zinc-700"}`}>
                {item.title}
              </p>
              <span className="text-[10px] text-zinc-400 shrink-0">{fmtDate(item.updatedAt)}</span>
            </div>
            {item.subtitle && (
              <p className="text-[10px] uppercase tracking-widest text-zinc-400 mt-0.5">{item.subtitle}</p>
            )}
            <p className="text-xs text-zinc-500 truncate mt-1">{item.preview}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
