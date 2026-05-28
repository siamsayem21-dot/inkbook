"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [studioName, setStudioName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!studioName.trim()) return setError("Studio name is required.");
    if (!ownerName.trim()) return setError("Your name is required.");
    if (!email.trim()) return setError("Email is required.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (!/^[a-z0-9-]+$/.test(subdomain))
      return setError("Subdomain can only contain lowercase letters, numbers, and hyphens.");

    setLoading(true);
    const supabase = createClient();

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: ownerName } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    const userId = authData.user?.id;
    if (!userId) {
      setError("Sign-up succeeded but no user was returned. Please check your email to confirm your account.");
      setLoading(false);
      return;
    }

    const studioRes = await fetch("/api/studios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, name: studioName.trim(), subdomain: subdomain.trim() }),
    });
    const studioJson = await studioRes.json();

    if (!studioRes.ok) {
      setError(studioJson.error ?? "Failed to create studio.");
      setLoading(false);
      return;
    }

    router.push("/owner/dashboard");
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
      <h1 className="text-2xl font-bold mb-1">Create your studio</h1>
      <p className="text-zinc-400 text-sm mb-8">Start your free 14-day trial. No credit card required.</p>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-950 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div>
          <label className="text-sm text-zinc-400 block mb-1.5">Studio name</label>
          <input
            type="text"
            placeholder="Ink & Iron Studio"
            value={studioName}
            onChange={(e) => setStudioName(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-500"
          />
        </div>
        <div>
          <label className="text-sm text-zinc-400 block mb-1.5">Your name</label>
          <input
            type="text"
            placeholder="Jane Smith"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-500"
          />
        </div>
        <div>
          <label className="text-sm text-zinc-400 block mb-1.5">Email</label>
          <input
            type="email"
            placeholder="you@studio.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-500"
          />
        </div>
        <div>
          <label className="text-sm text-zinc-400 block mb-1.5">Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-500"
          />
        </div>
        <div>
          <label className="text-sm text-zinc-400 block mb-1.5">Subdomain</label>
          <div className="flex items-center">
            <input
              type="text"
              placeholder="inkandironstudio"
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-l-lg px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-500"
            />
            <span className="bg-zinc-700 border border-l-0 border-zinc-700 rounded-r-lg px-3 py-2.5 text-sm text-zinc-400">
              .inkbook.app
            </span>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-white text-black font-semibold py-2.5 rounded-lg hover:bg-zinc-200 transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="text-zinc-500 text-sm text-center mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-white underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}
