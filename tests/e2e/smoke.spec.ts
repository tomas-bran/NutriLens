/**
 * Sprint 0 smoke E2E — checks the app boots and renders the home page.
 * Per-flow E2E tests (upload, history, chat) live in their own US.
 */
import { test, expect } from '@playwright/test';

test('home shows the NutriLens title', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'NutriLens', level: 1 })).toBeVisible();
});

test('home mentions it is an informational assistant', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/asistente informativo/i)).toBeVisible();
});
