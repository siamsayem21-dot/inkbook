"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "link_expired"
      ? "That link has expired. Please request a new one below."
      : null
  );
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    // Client-side (soft) navigation instead of a hard reload — the auth cookie
    // is already set by signInWithPassword() above (@supabase/ssr writes it via
    // document.cookie synchronously), so middleware and the /dashboard redirect
    // hub both see the fresh session on the very next request either way. Same
    // proven pattern app/(auth)/register/page.tsx already uses after signUp().
    // Avoids a full browser reload (re-fetching every JS asset from scratch) on
    // every single login, which was a measured, real contributor to login being
    // by far the slowest interaction in the app (see OWNER_DASHBOARD_PERF.md).
    router.push("/dashboard");
  }

  async function handleForgotPassword() {
    if (!email) {
      setError("Enter your email address above first, then click Forgot password.");
      return;
    }
    setResetLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    setResetLoading(false);
    if (resetError) {
      setError(resetError.message);
    } else {
      setResetSent(true);
    }
  }

  return (
    <div className="border border-white/[0.08] bg-zinc-900/50 p-8">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-10">
        <div className="w-7 h-7 border border-gold/40 flex items-center justify-center">
          <span className="font-cinzel text-gold text-[10px] font-bold">IB</span>
        </div>
        <span className="font-cinzel text-sm tracking-wider text-white">InkBook</span>
      </div>

      <h1 className="font-cinzel text-2xl font-bold tracking-wide mb-1">Welcome Back</h1>
      <p className="text-zinc-500 text-sm mb-8">Sign in to your studio dashboard.</p>

      {resetSent ? (
        <div className="border border-green-800/60 text-green-400 text-sm px-4 py-4 text-center bg-green-950/40">
          <p className="font-cinzel font-semibold text-xs tracking-wide mb-1">Password Reset Sent</p>
          <p className="text-green-500/70 text-xs">Check your inbox for {email} and click the link to reset your password.</p>
        </div>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {error && (
            <div className="border border-red-800/60 text-red-400 text-sm px-4 py-3 bg-red-950/40">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="login-email" className="label-xs text-zinc-500 block mb-2">Email</label>
            <input
              id="login-email"
              required
              type="email"
              placeholder="you@studio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-900 border border-white/[0.1] px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-gold/50 transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="login-password" className="label-xs text-zinc-500">Password</label>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resetLoading}
                className="label-xs text-zinc-600 hover:text-gold transition-colors disabled:opacity-50"
              >
                {resetLoading ? "Sending…" : "Forgot Password?"}
              </button>
            </div>
            <input
              id="login-password"
              required
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-900 border border-white/[0.1] px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-gold/50 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gold text-black label-sm py-3 hover:bg-gold-light disabled:opacity-50 transition-colors mt-2"
          >
            {loading ? "Signing In…" : "Sign In"}
          </button>
        </form>
      )}

      <div className="gold-divider mt-6" />
      <p className="text-zinc-600 text-sm text-center mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-gold hover:text-gold-light transition-colors underline underline-offset-4">
          Create Studio
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
