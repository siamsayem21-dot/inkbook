import { test, expect } from "@playwright/experimental-ct-react";
import ConsultationForm from "@/app/book/[studio]/consult/ConsultationForm";

const BASE_PROPS = {
  studioSlug: "ink-iron",
  studioId: "studio-1",
  studioName: "Ink & Iron",
  primaryColor: "#D4A853",
  textOnBrand: "#000000",
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/ai/consultation-questions", (route) =>
    route.fulfill({
      json: { questions: ["Do you have reference photos?", "Any color preference beyond what you selected?"] },
    })
  );
  await page.route("**/api/ai/style-detect", (route) =>
    route.fulfill({
      json: {
        style: "Japanese",
        confidence: 88,
        reasoning: "The description mentions koi and waves, a hallmark of Japanese style.",
        aiNotes: "Client wants a large, detailed piece — budget for multiple sessions.",
      },
    })
  );
});

async function fillStep1(component: import("playwright/test").Locator) {
  await component.getByPlaceholder("Alex Johnson").fill("Alex Client");
  await component.getByPlaceholder("alex@example.com").fill("alex@example.com");
  await component.getByPlaceholder("+1 (555) 000-0000").fill("5551234567");
  await component.getByRole("button", { name: /continue/i }).click();
}

async function fillStep2(component: import("playwright/test").Locator) {
  await component
    .getByPlaceholder(/describe your tattoo idea in detail/i)
    .fill("A large koi fish swimming upstream through cherry blossoms and waves");
  await component.getByPlaceholder(/left forearm/i).fill("Right shoulder to elbow");
  await component.locator("select").nth(0).selectOption({ label: "Large (4–8\")" });
  await component.locator("select").nth(1).selectOption({ label: "$500–$1,000" });
  await component.getByRole("button", { name: /analyze with ai/i }).click();
}

test("requires name/email/phone before continuing past step 1", async ({ mount }) => {
  const component = await mount(<ConsultationForm {...BASE_PROPS} />);
  await expect(component.getByText("Your Information")).toBeVisible();

  await component.getByRole("button", { name: /continue/i }).click();
  await expect(component.getByText("Name is required")).toBeVisible();
  await expect(component.getByText("Valid email is required")).toBeVisible();
  await expect(component.getByText("Phone is required")).toBeVisible();
});

test("requires a description of at least 20 chars, placement, size, and budget on step 2", async ({ mount }) => {
  const component = await mount(<ConsultationForm {...BASE_PROPS} />);
  await fillStep1(component);
  await expect(component.getByText("Your Vision")).toBeVisible();

  await component.getByPlaceholder(/describe your tattoo idea in detail/i).fill("too short");
  await component.getByRole("button", { name: /analyze with ai/i }).click();
  await expect(component.getByText(/at least 20 characters/i)).toBeVisible();
  await expect(component.getByText("Placement is required")).toBeVisible();
  await expect(component.getByText("Please select a size")).toBeVisible();
  await expect(component.getByText("Please select a budget range")).toBeVisible();
});

test("walks the full happy path: AI questions -> style detection -> review -> submit", async ({ mount, page }) => {
  const component = await mount(<ConsultationForm {...BASE_PROPS} />);
  await fillStep1(component);
  await fillStep2(component);

  // Step 3 — AI-provided follow-up questions rendered verbatim
  await expect(component.getByText("A Few Questions")).toBeVisible();
  await expect(component.getByText("Do you have reference photos?")).toBeVisible();
  await component.getByRole("button", { name: /detect my style/i }).click();

  // Step 4 — AI style detection result rendered
  await expect(component.getByText("AI Style Detection")).toBeVisible();
  await expect(component.locator("p.font-cinzel", { hasText: "Japanese" })).toBeVisible();
  await expect(component.getByText("88%")).toBeVisible();
  await component.getByRole("button", { name: /review summary/i }).click();

  // Step 5 — review summary reflects entered data
  await expect(component.getByText("Review Your Consultation")).toBeVisible();
  await expect(component.getByText("Alex Client")).toBeVisible();
  await expect(component.getByText("alex@example.com")).toBeVisible();

  await page.evaluate(() => {
    window.__consultationResult = { id: "consult-42" };
  });
  await component.getByRole("button", { name: /submit consultation/i }).click();

  // Success screen
  await expect(component.getByText("Consultation Submitted!")).toBeVisible();
  await expect(component.getByText("consult-42")).toBeVisible();

  const submission = await page.evaluate(() => window.__lastConsultationSubmission);
  expect(submission?.clientEmail).toBe("alex@example.com");
  expect(submission?.detectedStyle).toBe("Japanese");
});

test("shows a submit error and stays on the review step when the server action fails", async ({ mount, page }) => {
  const component = await mount(<ConsultationForm {...BASE_PROPS} />);
  await fillStep1(component);
  await fillStep2(component);
  await component.getByRole("button", { name: /detect my style/i }).click();
  await component.getByRole("button", { name: /review summary/i }).click();

  await page.evaluate(() => {
    window.__consultationResult = { error: "Failed to save your consultation — please try again" };
  });
  await component.getByRole("button", { name: /submit consultation/i }).click();

  await expect(component.getByText(/failed to save your consultation/i)).toBeVisible();
  await expect(component.getByText("Review Your Consultation")).toBeVisible();
});
