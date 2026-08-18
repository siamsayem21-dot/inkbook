"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { checkOtpSendAllowed } from "../rate-limit-action";

interface Props {
  studioSlug: string;
  email: string;
  brandColor: string;
  textOnBrand: string;
}

const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function OtpVerifyForm({ studioSlug, email, brandColor, textOnBrand }: Props) {
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  async function verify(code: string) {
    if (code.length !== CODE_LENGTH) return;
    setError(null);
    setVerifying(true);

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    if (verifyError) {
      setVerifying(false);
      setError(verifyError.message);
      setDigits(Array(CODE_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
      return;
    }

    window.location.href = `/portal/${studioSlug}/dashboard`;
  }

  function handleChange(index: number, value: string) {
    const char = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);

    if (char && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (next.every((d) => d !== "")) {
      verify(next.join(""));
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(CODE_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    const lastIndex = Math.min(pasted.length, CODE_LENGTH) - 1;
    inputRefs.current[lastIndex]?.focus();
    if (pasted.length === CODE_LENGTH) verify(pasted);
  }

  async function handleResend() {
    setError(null);
    setResending(true);

    const rateLimit = await checkOtpSendAllowed(email);
    if (!rateLimit.allowed) {
      setResending(false);
      setError("Too many attempts. Please wait a bit before trying again.");
      return;
    }

    const supabase = createClient();
    const { error: resendError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });

    setResending(false);

    if (resendError) {
      setError(resendError.message);
      return;
    }

    setDigits(Array(CODE_LENGTH).fill(""));
    setCountdown(RESEND_SECONDS);
    inputRefs.current[0]?.focus();
  }

  const code = digits.join("");

  return (
    <div className="border border-white/[0.08] bg-zinc-900/50 p-8">
      {error && (
        <div className="border border-red-800/60 text-red-400 text-sm px-4 py-3 bg-red-950/40 mb-5">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 sm:gap-3 mb-6">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            value={digit}
            disabled={verifying}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            className="w-full aspect-square max-w-14 text-center text-xl font-semibold bg-zinc-900 border border-white/[0.1] text-white focus:outline-none focus:border-[var(--brand-primary)] transition-colors disabled:opacity-50"
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => verify(code)}
        disabled={verifying || code.length !== CODE_LENGTH}
        className="w-full text-sm font-bold uppercase tracking-widest py-3.5 transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: brandColor, color: textOnBrand }}
      >
        {verifying ? "Verifying…" : "Verify & Continue"}
      </button>

      <div className="text-center mt-6">
        {countdown > 0 ? (
          <p className="text-zinc-600 text-xs">
            Didn&apos;t get a code? Resend in {countdown}s
          </p>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="text-xs font-semibold uppercase tracking-widest transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ color: brandColor }}
          >
            {resending ? "Sending…" : "Resend Code"}
          </button>
        )}
      </div>
    </div>
  );
}
