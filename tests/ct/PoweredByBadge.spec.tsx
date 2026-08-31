import { test, expect } from "@playwright/experimental-ct-react";
import PoweredByBadge from "@/components/booking/PoweredByBadge";

test("renders a link to inkbook.tech that opens in a new tab", async ({ mount }) => {
  const component = await mount(<PoweredByBadge />);
  const link = component.getByRole("link", { name: "Powered by InkBook" });

  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", "https://inkbook.tech");
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
});
