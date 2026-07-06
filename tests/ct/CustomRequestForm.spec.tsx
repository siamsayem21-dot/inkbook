import { test, expect } from "@playwright/experimental-ct-react";
import CustomRequestForm from "@/app/book/[studio]/custom/CustomRequestForm";

const BASE_PROPS = {
  studioSlug: "ink-iron",
  studioId: "studio-1",
  studioName: "Ink & Iron",
  artists: [
    { id: "artist-1", name: "Jane Artist" },
    { id: "artist-2", name: "Sam Artist" },
  ],
  primaryColor: "#D4A853",
  textOnBrand: "#000000",
};

async function fillStep1(component: import("playwright/test").Locator) {
  await component.getByPlaceholder("Jane Smith").fill("Alex Client");
  await component.getByPlaceholder("you@example.com").fill("alex@example.com");
  await component.getByPlaceholder("+1 (555) 000-0000").fill("5551234567");
  await component.locator("select").selectOption({ label: "Jane Artist" });
  await component.getByRole("button", { name: /next/i }).click();
}

async function fillStep2(component: import("playwright/test").Locator) {
  await component.locator("select").nth(0).selectOption({ label: "Japanese" });
  await component.getByPlaceholder(/left forearm, upper back/i).fill("Full back piece");
  await component.locator("select").nth(1).selectOption({ label: "Large (4–6\")" });
  await component.locator("select").nth(2).selectOption({ label: "$600–1,000" });
  await component
    .getByPlaceholder(/describe your tattoo idea in detail/i)
    .fill("A large koi fish swimming upstream through cherry blossoms and waves");
  await component.getByRole("button", { name: /next/i }).click();
}

test("blocks step 1 -> 2 until name/email/phone are valid", async ({ mount }) => {
  const component = await mount(<CustomRequestForm {...BASE_PROPS} />);
  await component.getByPlaceholder("Jane Smith").fill("A");
  await component.getByPlaceholder("Jane Smith").blur();
  await component.getByPlaceholder("you@example.com").fill("not-an-email");
  await component.getByPlaceholder("you@example.com").blur();
  await component.getByRole("button", { name: /next/i }).click();

  await expect(component.getByText("Name must be at least 2 characters")).toBeVisible();
  await expect(component.getByText("Enter a valid email address")).toBeVisible();
  await expect(component.getByText("Phone number is required")).toBeVisible();
});

test("blocks step 2 -> 3 until style/placement/size/budget/description are filled", async ({ mount }) => {
  const component = await mount(<CustomRequestForm {...BASE_PROPS} />);
  await fillStep1(component);
  await expect(component.getByText("Step 2 of 3")).toBeVisible();

  await component.getByRole("button", { name: /next/i }).click();
  await expect(component.getByText("Please select a tattoo style")).toBeVisible();
  await expect(component.getByText("Please describe the placement")).toBeVisible();
  await expect(component.getByText("Please select a size")).toBeVisible();
  await expect(component.getByText("Please select a budget range")).toBeVisible();
  await expect(component.getByText(/min 20 characters/i)).toBeVisible();
});

test("walks the full happy path through submission and shows the success screen", async ({ mount, page }) => {
  const component = await mount(<CustomRequestForm {...BASE_PROPS} />);
  await fillStep1(component);
  await fillStep2(component);

  await expect(component.getByText("Step 3 of 3")).toBeVisible();
  await expect(component.getByRole("heading", { name: "Review Your Request" })).toBeVisible();
  await expect(component.getByText("Alex Client")).toBeVisible();
  await expect(component.getByText("Jane Artist")).toBeVisible();

  await page.evaluate(() => {
    window.__customRequestResult = { id: "req-99" };
  });
  await component.getByRole("button", { name: /submit request/i }).click();

  await expect(component.getByText("Request Submitted!")).toBeVisible();
  await expect(component.getByText(/Jane Artist/)).toBeVisible();

  const submission = await page.evaluate(() => window.__lastCustomRequestSubmission);
  expect(submission?.clientEmail).toBe("alex@example.com");
  expect(submission?.style).toBe("Japanese");
  expect(submission?.artistId).toBe("artist-1");
});

test("shows a submit error and stays on step 3 when the server action fails", async ({ mount, page }) => {
  const component = await mount(<CustomRequestForm {...BASE_PROPS} />);
  await fillStep1(component);
  await fillStep2(component);

  await page.evaluate(() => {
    window.__customRequestResult = { error: "Failed to save your request — please try again" };
  });
  await component.getByRole("button", { name: /submit request/i }).click();

  await expect(component.getByText(/failed to save your request/i)).toBeVisible();
  await expect(component.getByRole("heading", { name: "Review Your Request" })).toBeVisible();
});

test("allows submitting with no preferred artist", async ({ mount, page }) => {
  const component = await mount(<CustomRequestForm {...BASE_PROPS} />);
  await component.getByPlaceholder("Jane Smith").fill("Alex Client");
  await component.getByPlaceholder("you@example.com").fill("alex@example.com");
  await component.getByPlaceholder("+1 (555) 000-0000").fill("5551234567");
  await component.getByRole("button", { name: /next/i }).click();
  await fillStep2(component);

  await expect(component.getByText("No preference")).toBeVisible();

  await page.evaluate(() => {
    window.__customRequestResult = { id: "req-100" };
  });
  await component.getByRole("button", { name: /submit request/i }).click();
  await expect(component.getByText("Request Submitted!")).toBeVisible();

  const submission = await page.evaluate(() => window.__lastCustomRequestSubmission);
  expect(submission?.artistId).toBe("");
});
