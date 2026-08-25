export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FAF9FC] text-zinc-900 flex items-center justify-center px-4 overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(124,58,237,0.06),transparent)] pointer-events-none" />
      <div className="relative w-full max-w-md z-10">{children}</div>
    </div>
  );
}
