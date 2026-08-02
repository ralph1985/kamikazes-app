import { expect, test } from "@playwright/test";

test("la superficie inicial está disponible", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /base para gestionar/i })).toBeVisible();
  await expect(page.getByText(/hito 0/i)).toBeVisible();
});
