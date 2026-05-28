import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
      <h1 className="text-2xl font-bold mb-1">Welcome back</h1>
      <p className="text-zinc-400 text-sm mb-8">Sign in to your InkBook account.</p>

      <form className="flex flex-col gap-4">
        <div>
          <label className="text-sm text-zinc-400 block mb-1.5">Email</label>
          <input
            type="email"
            placeholder="you@studio.com"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-500"
          />
        </div>
        <div>
          <label className="text-sm text-zinc-400 block mb-1.5">Password</label>
          <input
            type="password"
            placeholder="••••••••"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-500"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-white text-black font-semibold py-2.5 rounded-lg hover:bg-zinc-200 transition-colors mt-2"
        >
          Sign in
        </button>
      </form>

      <p className="text-zinc-500 text-sm text-center mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-white underline underline-offset-4">
          Register
        </Link>
      </p>
    </div>
  );
}
