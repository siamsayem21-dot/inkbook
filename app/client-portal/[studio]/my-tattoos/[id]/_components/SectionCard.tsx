import type { LucideIcon } from "lucide-react";

interface Props {
  id?: string;
  icon: LucideIcon;
  title: string;
  badge?: React.ReactNode;
  muted?: boolean; // dims the card for "not reached yet" / inactive sections
  children: React.ReactNode;
}

export default function SectionCard({ id, icon: Icon, title, badge, muted, children }: Props) {
  return (
    <div id={id} className={`bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 scroll-mt-24 ${muted ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
            <Icon size={16} />
          </span>
          <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
        </div>
        {badge}
      </div>
      {children}
    </div>
  );
}
