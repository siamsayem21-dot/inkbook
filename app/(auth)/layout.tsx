export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grain min-h-screen bg-ink text-white flex items-center justify-center px-4 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(201,168,76,0.07),transparent)] pointer-events-none" />
      <div className="relative w-full max-w-md z-10">{children}</div>
    </div>
  );
}
