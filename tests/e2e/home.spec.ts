/**
 * E2E — Home / landing (US-07).
 *
 * Cubre los AC de la US-07:
 *   - Escenario 1: pantalla informativa con hero + cómo funciona + ejemplos.
 *   - "Analizar producto" del hero lleva al flujo /analizar.
 */
import { test } from '@playwright/test';
import { HomePage } from './pages/home-page';

test('home renderiza hero, cómo funciona, ejemplos y disclaimer', async ({ page }) => {
  const home = new HomePage(page);
  await home.goto();
  await home.expectHeroVisible();
  await home.expectHowItWorksSection();
  await home.expectExamplesSection();
  await home.expectDocsLink();
  await home.expectDisclaimer();
});

test('click en "Analizar producto" del hero navega a /analizar', async ({ page }) => {
  const home = new HomePage(page);
  await home.goto();
  await home.clickHeroCta();
  await home.expectUrl(/\/analizar$/);
});
