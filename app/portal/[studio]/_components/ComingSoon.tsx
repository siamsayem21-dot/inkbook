interface Props {
  title: string;
  description: string;
}

export default function ComingSoon({ title, description }: Props) {
  return (
    <div className="max-w-lg">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">Client Portal</p>
      <h1 className="font-serif text-2xl md:text-3xl tracking-wide mb-3">{title}</h1>
      <p className="text-zinc-400 text-sm leading-relaxed">{description}</p>

      <div className="mt-8 border border-white/[0.08] bg-zinc-900/40 px-6 py-14 text-center">
        <p className="text-zinc-500 text-sm">This feature is coming soon.</p>
      </div>
    </div>
  );
}
