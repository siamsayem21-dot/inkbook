import path from "path";
import { test, expect } from "@playwright/test";
import { assertDbEnv } from "../db/helpers";
import { e2eTag, e2eAdminClient, fetchLatestInviteToken, hasStripeKeys, payWithStripeTestCard } from "./helpers";

test.beforeAll(() => assertDbEnv());

test.describe("Full owner workflow", () => {
  test("create studio -> login -> AI consultation -> quote -> deposit -> booking -> consent -> dashboard", async ({ browser }) => {
    const tag = e2eTag();
    const ownerEmail = `${tag}-owner@example.test`;
    const password = "Password123!";
    const studioName = `${tag} Studio`;
    const subdomain = `${tag}-sub`.toLowerCase();
    const artistEmail = `${tag}-artist@example.test`;
    const artistName = "Jane Test Artist";
    const clientName = "Alex E2E Client";

    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();

    // ── 1. Create Studio ──────────────────────────────────────────────────
    await test.step("Create Studio", async () => {
      await ownerPage.goto("/register");
      await ownerPage.getByPlaceholder("Ink & Iron Studio").fill(studioName);
      await ownerPage.getByPlaceholder("Jane Smith").fill("Owner E2E");
      await ownerPage.getByPlaceholder("you@studio.com").fill(ownerEmail);
      await ownerPage.getByPlaceholder("••••••••").fill(password);
      await ownerPage.getByPlaceholder("inkandironstudio").fill(subdomain);
      await ownerPage.getByRole("button", { name: /create account/i }).click();

      await ownerPage.waitForURL(/\/owner\/dashboard/, { timeout: 20_000 });
      await expect(ownerPage.getByText("Studio Dashboard")).toBeVisible();
    });

    // ── 2. Login (sign out, sign back in) ─────────────────────────────────
    await test.step("Login", async () => {
      await ownerPage.getByRole("button", { name: /sign out/i }).click();
      await ownerPage.waitForURL((url: URL) => !url.pathname.startsWith("/owner"));

      await ownerPage.goto("/login");
      await ownerPage.getByPlaceholder("you@studio.com").fill(ownerEmail);
      await ownerPage.getByPlaceholder("••••••••").fill(password);
      await ownerPage.getByRole("button", { name: /sign in/i }).click();

      await ownerPage.waitForURL(/\/owner\/dashboard/, { timeout: 20_000 });
    });

    // ── 3. Invite + onboard an artist (needed to book an appointment) ─────
    let studioId = "";
    await test.step("Invite and onboard an artist", async () => {
      const { data: studioRow } = await e2eAdminClient()
        .from("studios")
        .select("id")
        .eq("subdomain", subdomain)
        .single();
      studioId = studioRow!.id;

      await ownerPage.goto("/owner/artists");
      await ownerPage.getByRole("button", { name: /invite artist/i }).click();
      await ownerPage.getByLabel(/name/i).first().fill(artistName);
      await ownerPage.getByLabel(/email/i).first().fill(artistEmail);
      await ownerPage.getByRole("button", { name: /send invite/i }).click();
      // Bare email text also matches the artist's row, which re-renders in
      // the DOM (desktop table + mobile card) as soon as onSuccess() fires —
      // scope to the modal's own confirmation message to keep this a
      // single-element match.
      await expect(ownerPage.getByText(`Invite sent to ${artistEmail}`)).toBeVisible({ timeout: 10_000 });

      const token = await fetchLatestInviteToken(studioId, artistEmail);

      const artistContext = await browser.newContext();
      const artistPage = await artistContext.newPage();
      await artistPage.goto(`/artist/accept/${token}`);
      await artistPage.getByLabel(/set a password/i).fill(password);
      await artistPage.getByLabel(/confirm password/i).fill(password);
      await artistPage.getByRole("button", { name: /join/i }).click();
      await artistPage.waitForURL(/\/(artist\/dashboard|login)/, { timeout: 20_000 });
      await artistContext.close();
    });

    // ── 4. AI Consultation (client-facing, no auth) ────────────────────────
    await test.step("Submit AI consultation", async () => {
      const clientContext = await browser.newContext();
      const clientPage = await clientContext.newPage();
      await clientPage.goto(`/book/${subdomain}/consult`);

      await clientPage.getByPlaceholder("Alex Johnson").fill(clientName);
      await clientPage.getByPlaceholder("alex@example.com").fill(`${tag}-client@example.test`);
      await clientPage.getByPlaceholder("+1 (555) 000-0000").fill("5551234567");
      await clientPage.getByRole("button", { name: /continue/i }).click();

      await clientPage
        .getByPlaceholder(/describe your tattoo idea in detail/i)
        .fill("A large detailed koi fish swimming upstream through cherry blossoms");
      await clientPage.getByPlaceholder(/left forearm/i).fill("Right shoulder to elbow");
      await clientPage.locator("select").nth(0).selectOption({ index: 3 });
      await clientPage.locator("select").nth(1).selectOption({ index: 2 });
      await clientPage.getByRole("button", { name: /analyze with ai/i }).click();

      await expect(clientPage.getByText("A Few Questions")).toBeVisible({ timeout: 15_000 });
      await clientPage.getByRole("button", { name: /detect my style/i }).click();

      await expect(clientPage.getByText("AI Style Detection")).toBeVisible({ timeout: 15_000 });
      await clientPage.getByRole("button", { name: /review summary/i }).click();

      await expect(clientPage.getByText("Review Your Consultation")).toBeVisible();
      await clientPage.getByRole("button", { name: /submit consultation/i }).click();
      await expect(clientPage.getByText("Consultation Submitted!")).toBeVisible({ timeout: 15_000 });
      await clientContext.close();
    });

    // ── 5. Owner: quote, then pick the artist for the Deposit Collection
    // section. The "Book Appointment" date/time section (below) only
    // renders once status is "deposit_paid" — it doesn't exist yet here,
    // so date/time/confirm are handled in a later step (see step 6b).
    await test.step("Owner reviews and quotes the consultation", async () => {
      await ownerPage.goto("/owner/consultations");
      await ownerPage.getByText(clientName).first().click();
      await ownerPage.waitForURL(/\/owner\/consultations\/.+/);

      await ownerPage.getByRole("button", { name: /generate ai quote/i }).click();
      await expect(ownerPage.getByRole("button", { name: /save quote/i })).toBeEnabled({ timeout: 15_000 });
      await ownerPage.getByRole("button", { name: /save quote/i }).click();
      await expect(ownerPage.getByText(/quote saved/i)).toBeVisible({ timeout: 10_000 });
      await expect(ownerPage.getByText(/deposit collection/i)).toBeVisible({ timeout: 10_000 });

      await ownerPage.locator("select").first().selectOption({ label: artistName });
    });

    // Generating a deposit link calls the real Stripe API server-side (same
    // requirement as the payment/consent/dashboard steps below) — without
    // test keys configured, this call fails with "Stripe is not configured."
    test.skip(!hasStripeKeys(), "STRIPE_SECRET_KEY / NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY not configured — skipping deposit link generation, live deposit payment, consent, and dashboard confirmation steps");

    let depositUrl = "";
    await test.step("Owner generates the deposit link", async () => {
      await ownerPage.getByRole("button", { name: /generate deposit link/i }).click();
      const linkInput = ownerPage.locator("input[readonly]");
      await expect(linkInput).toHaveValue(/checkout\.stripe\.com|http/, { timeout: 15_000 });
      depositUrl = await linkInput.inputValue();
    });

    // ── 6. Client pays the deposit (real Stripe test-mode checkout) ────────
    const clientContext = await browser.newContext();
    const clientPage = await clientContext.newPage();
    await test.step("Client pays the deposit via Stripe test card", async () => {
      await clientPage.goto(depositUrl);
      await payWithStripeTestCard(clientPage);
      await clientPage.waitForURL(/\/book\/.+\/book\/consent/, { timeout: 30_000 });
    });

    // ── 6b. Owner: now that the deposit is paid (status -> deposit_paid),
    // the "Book Appointment" date/time section appears — the artist is
    // already locked in from step 5 (consult.artist_id was set server-side
    // when the deposit link was generated), so only date/time remain here.
    // The client reaching the consent page (previous step) confirms Stripe's
    // own redirect fired, not that our webhook has finished updating
    // deposit_paid status server-side yet — poll with reloads rather than
    // assuming a single reload wins the race.
    await test.step("Owner schedules the appointment date/time", async () => {
      const dateInput = ownerPage.locator('input[type="date"]');
      await expect(async () => {
        await ownerPage.reload({ waitUntil: "networkidle" });
        await expect(dateInput).toBeVisible({ timeout: 2_000 });
      }).toPass({ timeout: 30_000, intervals: [2_000] });

      const tomorrow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      await dateInput.fill(tomorrow);
      await ownerPage.locator('input[type="time"]').fill("14:00");
      await ownerPage.getByRole("button", { name: /confirm appointment/i }).click();
      await expect(ownerPage.getByText("Appointment")).toBeVisible({ timeout: 15_000 });
      await expect(ownerPage.getByText(artistName)).toBeVisible();
    });

    // ── 7. Client signs the consent form ───────────────────────────────────
    await test.step("Client signs the consent form", async () => {
      await clientPage.getByLabel(/full legal name/i).fill(clientName);
      await clientPage.getByLabel(/date of birth/i).fill("1990-01-01");
      await clientPage
        .getByLabel(/government id photo/i)
        .setInputFiles(path.join(__dirname, "fixtures", "tiny.jpg"));
      await clientPage.getByRole("checkbox").check();
      await clientPage.getByLabel(/signature/i).fill(clientName);
      await clientPage.getByRole("button", { name: /sign & confirm booking/i }).click();

      await clientPage.waitForURL(/\/book\/.+\/book\/confirmation/, { timeout: 15_000 });
      await clientContext.close();
    });

    // ── 8. Owner dashboard reflects the completed booking ──────────────────
    await test.step("Owner dashboard shows the confirmed booking", async () => {
      await ownerPage.goto("/owner/dashboard");
      await expect(ownerPage.getByText("Total bookings")).toBeVisible();
      await expect(ownerPage.getByText("No Bookings Yet")).not.toBeVisible();

      await ownerPage.goto("/owner/bookings");
      await expect(ownerPage.getByText(clientName)).toBeVisible({ timeout: 10_000 });
    });

    await ownerContext.close();
  });
});
