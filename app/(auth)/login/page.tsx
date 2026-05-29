"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
      <div className="flex items-center gap-2 mb-8">
        <div className="w-7 h-7 rounded-lg bg-gold flex items-center justify-center">
          <span className="text-black text-xs font-black">IB</span>
        </div>
        <span className="font-bold">InkBook</span>
      </div>

      <h1 className="text-2xl font-bold mb-1">Welcome back</h1>
      <p className="text-zinc-400 text-sm mb-8">Sign in to your studio dashboard.</p>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-950 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div>
          <label className="text-sm text-zinc-400 block mb-1.5">Email</label>
          <input
            required
            type="email"
            placeholder="you@studio.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gold transition-colors"
          />
        </div>
        <div>
          <label className="text-sm text-zinc-400 block mb-1.5">Password</label>
          <input
            required
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gold transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gold text-black font-bold py-2.5 rounded-lg hover:bg-gold-light disabled:opacity-50 transition-colors mt-2"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="text-zinc-500 text-sm text-center mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-gold hover:text-gold-light underline underline-offset-4">
          Create studio
        </Link>
      </p>
    </div>
  );
}
