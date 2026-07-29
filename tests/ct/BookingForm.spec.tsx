import { test, expect } from "@playwright/experimental-ct-react";
import BookingForm from "@/components/booking/BookingForm";

const BASE_PROPS = {
  studioSlug: "ink-iron",
  artistId: "artist-1",
};

async function fillForm(component: import("playwright/test").Locator) {
  await component.getByPlaceholder("Jane Smith").fill("Alex Client");
  await component.getByPlaceholder("you@example.com").fill("alex@example.com");
  await component.getByPlaceholder("+1 (555) 000-0000").fill("5551234567");
  await component.locator('input[type="date"]').fill("2026-08-15");
  await component.locator("select").nth(0).selectOption({ label: "10:00 AM" });
  await component.locator("select").nth(1).selectOption({ label: "Traditional" });
  await component
    .getByPlaceholder(/small rose on inner wrist/i)
    .fill("A small rose on my wrist");
}

test("hides the spinner and keeps the submit button enabled while idle", async ({ mount }) => {
  const component = await mount(<BookingForm {...BASE_PROPS} />);
  const submitButton = component.getByRole("button", { name: "Continue to deposit →" });

  await expect(submitButton).toBeEnabled();
  await expect(component.getByRole("status")).toHaveCount(0);
});

test("shows the spinner and disables the button while submitting, then navigates on success", async ({
  mount,
  page,
}) => {
  let resolveRoute: () => void;
  const routeGate = new Promise<void>((resolve) => {
    resolveRoute = resolve;
  });

  await page.route("**/api/bookings", async (route) => {
    await routeGate;
    await route.fulfill({ json: { bookingId: "booking-123" } });
  });

  const component = await mount(<BookingForm {...BASE_PROPS} />);
  await fillForm(component);

  const submitButton = component.getByRole("button", { name: /continue to deposit|creating booking/i });
  await submitButton.click();

  await expect(component.getByText("Creating booking…")).toBeVisible();
  await expect(component.getByRole("status")).toBeVisible();
  await expect(submitButton).toBeDisabled();

  resolveRoute!();

  await page.waitForFunction(() => (window as unknown as { __lastPush?: string }).__lastPush);
  const lastPush = await page.evaluate(() => (window as unknown as { __lastPush?: string }).__lastPush);
  expect(lastPush).toContain("booking-123");
});

test("hides the spinner and re-enables the button when submission fails", async ({ mount, page }) => {
  await page.route("**/api/bookings", (route) =>
    route.fulfill({ status: 400, json: { error: "That time slot is no longer available" } })
  );

  const component = await mount(<BookingForm {...BASE_PROPS} />);
  await fillForm(component);

  const submitButton = component.getByRole("button", { name: /continue to deposit/i });
  await submitButton.click();

  await expect(component.getByText("That time slot is no longer available")).toBeVisible();
  await expect(submitButton).toBeEnabled();
  await expect(component.getByText("Creating booking…")).toHaveCount(0);
  await expect(component.getByRole("status")).toHaveCount(0);
});
