import Link from "next/link";

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
  basePath: string; // e.g. `/portal/${studio}/messages`, `/owner/messages`, `/artist/messages`
  accentColor: string;
  emptyTitle: string;
  emptyDescription: string;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ThreadList({ items, basePath, accentColor, emptyTitle, emptyDescription }: Props) {
  if (items.length === 0) {
    return (
      <div className="border border-white/[0.08] bg-zinc-900/40 px-6 py-14 text-center">
        <h2 className="font-serif text-xl md:text-2xl tracking-wide mb-2">{emptyTitle}</h2>
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
          className="border border-white/[0.08] bg-zinc-900/40 hover:border-white/20 transition-colors p-4 flex items-start gap-3"
        >
          <span
            className="w-2 h-2 rounded-full shrink-0 mt-1.5"
            style={{ backgroundColor: item.unread ? accentColor : "transparent" }}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className={`text-sm truncate ${item.unread ? "font-semibold text-zinc-100" : "text-zinc-300"}`}>
                {item.title}
              </p>
              <span className="text-[10px] text-zinc-600 shrink-0">{fmtDate(item.updatedAt)}</span>
            </div>
            {item.subtitle && <p className="text-[10px] text-zinc-600 mt-0.5">{item.subtitle}</p>}
            <p className="text-xs text-zinc-500 truncate mt-1">{item.preview}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
