"use server";

import { headers } from "next/headers";
import { checkRateLimit } from "@/lib/rate-limit";

// DEFERRED_ISSUES.md #10 (in-scope per strict completion mission): OTP
// send/resend had no app-level rate limiting, relying entirely on
// Supabase's own built-in email-rate-limit defaults. The actual OTP call
// (supabase.auth.signInWithOtp) stays client-side and unchanged — this is
// an additive pre-flight gate the client checks first, not a change to the
// auth call path itself, so it can't weaken or alter authentication
// behavior, only add a check in front of it.
//
// Keyed by IP+email together so one IP can't hammer many different emails,
// and repeatedly retrying the same email from the same browser is capped —
// while still leaving room for a real user who needs to resend once or
// twice for a slow inbox.
export async function checkOtpSendAllowed(
  email: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const h = headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() ?? h.get("x-real-ip") ?? "unknown";
  const identifier = `otp-send:${ip}:${email.trim().toLowerCase()}`;

  const result = checkRateLimit(identifier, 5, 10 * 60 * 1000); // 5 sends per 10 min
  if (result.allowed) return { allowed: true };
  return { allowed: false, retryAfter: result.retryAfter };
}
