import type { Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

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

  // Stripe's checkout requires a billing ZIP for US and, when Link is
  // enabled, a phone number too -- both are client-side validated, so
  // "Pay" silently no-ops (no navigation, no error) if either is left
  // blank rather than throwing.
  const zipField = page.locator('input[name="postalCode"], input#postalCode, input[placeholder="ZIP"]');
  if (await zipField.count()) await zipField.fill("90210");

  const phoneField = page.locator('input[type="tel"]');
  if (await phoneField.count()) await phoneField.fill("2015550123");

  // Stripe's hosted checkout page also has a "Pay with card" accordion
  // toggle whose accessible name matches /^pay/i, which appears in the DOM
  // before the real submit button does. locator.or(...).first() resolves
  // once and keeps retrying that same (wrong, never-visible) element rather
  // than re-evaluating for the submit button once it appears -- so try the
  // canonical, stable testid first and only fall back to the regex if it's
  // genuinely absent.
  try {
    await page.getByTestId("hosted-payment-submit-button").click({ timeout: 15_000 });
  } catch {
    await page.getByRole("button", { name: /^pay/i }).last().click();
  }

  await page.waitForURL((url: URL) => !url.hostname.includes("stripe.com"), { timeout: 30_000 });
}

/** Node-side (not browser) admin client — used to read DB state the UI can't surface directly (e.g. an invite token that would normally arrive by email). */
export function e2eAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
    // CI runs this Node-side client on Node 20, which has no native WebSocket —
    // @supabase/realtime-js requires one (or an injected transport) just to
    // construct the client, even though this helper never opens a realtime
    // subscription. Provide `ws` as the transport per Supabase's own guidance.
    realtime: { transport: WebSocket as unknown as typeof globalThis.WebSocket },
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
