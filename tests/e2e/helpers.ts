import type { Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { nodeRealtimeTransport } from "@/lib/supabase/realtime-transport";

/** Unique-per-run identifier so parallel/repeat CI runs never collide on unique columns. */
export function e2eTag(): string {
  return `e2e${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
}

export function hasStripeKeys(): boolean {
  return !!process.env.STRIPE_SECRET_KEY && !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
}

/**
 * Fills and submits Stripe's hosted test-mode Checkout page with the standard
 * "always succeeds" test card. Requires the page to already be on
 * checkout.stripe.com (i.e. after clicking a "pay deposit" action that
 * redirects there). Only exercised when STRIPE_SECRET_KEY / PUBLISHABLE_KEY
 * (test mode) are configured — see hasStripeKeys().
 */
export async function payWithStripeTestCard(page: Page) {
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 20_000 });

  const email = page.locator('input[name="email"], input#email');
  if (await email.count()) {
    const value = await email.first().inputValue().catch(() => "");
    if (!value) await email.first().fill(`stripe-e2e-${Date.now()}@example.test`);
  }

  await page.locator('input[name="cardNumber"], input#cardNumber').fill("4242424242424242");
  await page.locator('input[name="cardExpiry"], input#cardExpiry').fill("12/34");
  await page.locator('input[name="cardCvc"], input#cardCvc').fill("123");

  const nameField = page.locator('input[name="billingName"], input#billingName');
  if (await nameField.count()) await nameField.fill("E2E Test Client");

  const submit = page.getByTestId("hosted-payment-submit-button").or(page.getByRole("button", { name: /^pay/i }));
  await submit.first().click();

  await page.waitForURL((url: URL) => !url.hostname.includes("stripe.com"), { timeout: 30_000 });
}

/** Node-side (not browser) admin client — used to read DB state the UI can't surface directly (e.g. an invite token that would normally arrive by email). */
export function e2eAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: nodeRealtimeTransport },
  });
}

/** Polls for the artist_invites row created by inviteArtist() and returns its token. */
export async function fetchLatestInviteToken(studioId: string, email: string): Promise<string> {
  const admin = e2eAdminClient();
  for (let i = 0; i < 20; i++) {
    const { data } = await admin
      .from("artist_invites")
      .select("token")
      .eq("studio_id", studioId)
      .eq("invited_email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.token) return data.token as string;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`artist_invites row for ${email} never appeared`);
}
