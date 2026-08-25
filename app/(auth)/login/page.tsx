"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import PasswordInput from "@/components/ui/PasswordInput";

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
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-elevation-3 p-8">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-10">
        <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
          <span className="text-white text-xs font-bold">IB</span>
        </div>
        <span className="font-serif text-lg tracking-wide text-zinc-900">InkBook</span>
      </div>

      <h1 className="text-2xl font-bold tracking-tight mb-1 text-zinc-900">Welcome Back</h1>
      <p className="text-zinc-500 text-sm mb-8">Sign in to your studio dashboard.</p>

      {resetSent ? (
        <div className="rounded-xl border border-green-200 text-green-700 text-sm px-4 py-4 text-center bg-green-50">
          <p className="font-semibold text-sm mb-1">Password Reset Sent</p>
          <p className="text-green-600/80 text-xs">Check your inbox for {email} and click the link to reset your password.</p>
        </div>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-xl border border-red-200 text-red-700 text-sm px-4 py-3 bg-red-50">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="login-email" className="text-xs font-medium text-zinc-500 block mb-2">Email</label>
            <input
              id="login-email"
              required
              type="email"
              placeholder="you@studio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-4 py-2.5 text-sm bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 transition-colors"
            />
          </div>

          <PasswordInput
            id="login-password"
            label="Password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            labelAction={
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resetLoading}
                className="text-xs font-medium text-zinc-400 hover:text-violet-600 transition-colors disabled:opacity-50"
              >
                {resetLoading ? "Sending…" : "Forgot Password?"}
              </button>
            }
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-violet-600 text-white text-sm font-semibold py-3 hover:bg-violet-700 disabled:opacity-50 transition-colors mt-2"
          >
            {loading ? "Signing In…" : "Sign In"}
          </button>
        </form>
      )}

      <div className="h-px bg-zinc-100 mt-6" />
      <p className="text-zinc-500 text-sm text-center mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-violet-600 hover:text-violet-700 transition-colors underline underline-offset-4">
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
