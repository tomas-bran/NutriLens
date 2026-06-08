/**
 * E2E — Navegación responsive (NL-502).
 *
 * AC cubiertos:
 *   - Desktop (`≥768px`): sidebar fijo a la izquierda, totalmente clavado
 *     (no se mueve al scrollear), sin solaparse con el contenido; sin bottom nav.
 *   - Mobile (`<768px`): el sidebar se oculta y aparece el bottom nav fijo al
 *     borde inferior (la "versión mobile" no se pierde en pantallas chicas).
 *
 * El spec setea su propio viewport con `setViewportSize`, así que las
 * aserciones son las mismas bajo ambos proyectos de Playwright.
 */
import { test } from '@playwright/test';
import { BottomNav, Sidebar } from './components/sidebar';

const DESKTOP_BREAKPOINTS = [
  { w: 1440, h: 900 },
  { w: 1280, h: 800 },
  { w: 1024, h: 800 },
  { w: 768, h: 900 },
];

const MOBILE_BREAKPOINTS = [
  { w: 414, h: 896 },
  { w: 375, h: 812 },
  { w: 320, h: 640 },
];

for (const bp of DESKTOP_BREAKPOINTS) {
  test(`desktop ${bp.w}px: sidebar fijo a la izquierda, sin bottom nav`, async ({ page }) => {
    await page.setViewportSize({ width: bp.w, height: bp.h });
    await page.goto('/historial');
    const sidebar = new Sidebar(page);
    const bottomNav = new BottomNav(page);
    await sidebar.expectVisible();
    await sidebar.expectAnchoredLeft();
    await sidebar.expectFull();
    await sidebar.expectNoOverlapWithMain();
    await bottomNav.expectHidden();
  });
}

for (const bp of MOBILE_BREAKPOINTS) {
  test(`mobile ${bp.w}px: sidebar oculto, bottom nav anclado abajo`, async ({ page }) => {
    await page.setViewportSize({ width: bp.w, height: bp.h });
    await page.goto('/historial');
    const sidebar = new Sidebar(page);
    const bottomNav = new BottomNav(page);
    await sidebar.expectHidden();
    await bottomNav.expectVisible();
    await bottomNav.expectAnchoredBottom();
  });
}

test('el sidebar queda totalmente fijo al scrollear (era el bug reportado)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  const sidebar = new Sidebar(page);
  await sidebar.expectStaysFixedOnScroll();
});
