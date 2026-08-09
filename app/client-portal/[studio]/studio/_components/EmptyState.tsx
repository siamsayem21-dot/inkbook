interface Props {
  message: string;
}

// Honest "nothing here yet" state — used wherever a section's real data
// source (reviews, portfolio_images, flash_designs, studio_knowledge) has no
// rows for this studio, rather than filling the gap with invented content.
export default function EmptyState({ message }: Props) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-200 px-5 py-8 text-center">
      <p className="text-sm text-zinc-400">{message}</p>
    </div>
  );
}
