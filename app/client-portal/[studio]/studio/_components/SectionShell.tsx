import type { LucideIcon } from "lucide-react";

interface Props {
  id?: string;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

// Local to the Studio page only — Project Detail's SectionCard has its own
// approved look tied to that (locked) page and isn't reused here to keep the
// two modules independent.
export default function SectionShell({ id, icon: Icon, eyebrow, title, subtitle, action, children }: Props) {
  return (
    <section id={id} className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 sm:p-7 scroll-mt-24">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0 mt-0.5">
            <Icon size={17} />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-500">{eyebrow}</p>
            <h2 className="text-lg font-bold text-zinc-900 mt-0.5">{title}</h2>
            {subtitle && <p className="text-sm text-zinc-500 mt-1">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
