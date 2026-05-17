/**
 * Cheap smoke E2E — verifies the app boots and serves the home document.
 * Detailed home behavior lives in `home.spec.ts` (US-07).
 */
import { expect, test } from '@playwright/test';

test('home document loads with the NutriLens metadata title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/NutriLens/);
});

test('home mentions it is an informational assistant (disclaimer)', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/asistente informativo/i)).toBeVisible();
});
