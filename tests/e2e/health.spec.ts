import { expect, test } from "@playwright/test";

test("la superficie inicial está disponible", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /vida de la peña/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /entrar en la peña/i })).toBeVisible();
});

test("el menú lateral revela el login", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /abrir menú/i }).click();
  await expect(page.getByRole("navigation", { name: /navegación principal/i })).toBeVisible();
  await page.getByRole("link", { name: /iniciar sesión/i }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: /iniciar sesión/i })).toBeVisible();
});
