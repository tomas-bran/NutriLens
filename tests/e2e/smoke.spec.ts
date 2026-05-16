/**
 * Smoke E2E del Sprint 0 — verifica que la app arranca y renderiza el home.
 * Los E2E reales por flujo (upload, historial, chat) viven en sus US.
 */
import { test, expect } from '@playwright/test';

test('home muestra el título de NutriLens', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'NutriLens', level: 1 })).toBeVisible();
});

test('home menciona que es un asistente informativo', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/asistente informativo/i)).toBeVisible();
});
