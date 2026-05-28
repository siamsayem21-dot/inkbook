import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center gap-4">
      <h1 className="text-6xl font-bold">404</h1>
      <p className="text-zinc-400">This page doesn&apos;t exist.</p>
      <Link href="/" className="text-sm text-zinc-300 underline underline-offset-4">
        Back to home
      </Link>
    </main>
  );
}
