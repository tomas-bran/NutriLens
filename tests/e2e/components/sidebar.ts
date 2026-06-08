import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Page Objects de la navegación (NL-502). La navegación es responsive:
 *   - Desktop (`≥md`): <Sidebar> fijo a la izquierda; el <BottomNav> se oculta.
 *   - Mobile  (`<md`): el <Sidebar> se oculta; manda el <BottomNav> inferior.
 *
 * El test describe el QUÉ (fijo, anclado, oculto); estos objetos encapsulan el
 * CÓMO (selectores + lectura del bounding box).
 */
export class Sidebar {
  private readonly root: Locator;
  private readonly inicioLabel: Locator;

  constructor(private readonly page: Page) {
    this.root = page.getByTestId('app-sidebar');
    this.inicioLabel = page.getByTestId('nav-inicio').getByText('Inicio', { exact: true });
  }

  /** Visible (desktop). */
  async expectVisible() {
    await expect(this.root).toBeVisible();
  }

  /** Oculto (mobile: lo reemplaza el bottom nav). */
  async expectHidden() {
    await expect(this.root).toBeHidden();
  }

  /** Pegado al borde izquierdo del viewport (x ≈ 0) y `position: fixed`. */
  async expectAnchoredLeft() {
    const box = await this.root.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeLessThanOrEqual(1);
    const position = await this.root.evaluate((el) => getComputedStyle(el).position);
    expect(position).toBe('fixed');
  }

  /** Ancho de columna completo (240px) con labels visibles. */
  async expectFull() {
    const box = await this.root.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(200);
    await expect(this.inicioLabel).toBeVisible();
  }

  /** El contenido principal no se solapa con el sidebar (queda a su derecha). */
  async expectNoOverlapWithMain() {
    const sb = await this.root.boundingBox();
    const main = await this.page.locator('main').boundingBox();
    expect(main!.x).toBeGreaterThanOrEqual(sb!.width - 1);
  }

  /**
   * `position: fixed`: tras scrollear el contenido, el top del sidebar NO se
   * mueve (queda totalmente clavado al viewport). Este era el bug reportado.
   */
  async expectStaysFixedOnScroll() {
    const before = await this.root.boundingBox();
    await this.page.mouse.wheel(0, 800);
    await this.page.waitForTimeout(100);
    const after = await this.root.boundingBox();
    expect(Math.abs((after?.y ?? 0) - (before?.y ?? 0))).toBeLessThanOrEqual(1);
  }
}

export class BottomNav {
  private readonly root: Locator;

  constructor(private readonly page: Page) {
    this.root = page.getByTestId('app-bottom-nav');
  }

  /** Visible (mobile). */
  async expectVisible() {
    await expect(this.root).toBeVisible();
  }

  /** Oculto (desktop: manda el sidebar). */
  async expectHidden() {
    await expect(this.root).toBeHidden();
  }

  /** Pegado al borde inferior del viewport y ocupando todo el ancho. */
  async expectAnchoredBottom() {
    const box = await this.root.boundingBox();
    expect(box).not.toBeNull();
    const viewport = this.page.viewportSize();
    expect(Math.abs(box!.y + box!.height - viewport!.height)).toBeLessThanOrEqual(1);
    expect(box!.width).toBeGreaterThanOrEqual(viewport!.width - 1);
  }
}
