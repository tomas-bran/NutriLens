import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Page Object for `/` — the home (US-07).
 * The home is mostly informational; its main user flow is the CTA that
 * jumps to `/analizar`.
 */
export class HomePage {
  private readonly heroHeading: Locator;
  private readonly heroCta: Locator;
  private readonly howItWorksHeading: Locator;
  private readonly examplesHeading: Locator;
  private readonly historyCta: Locator;
  private readonly sidebar: Locator;
  private readonly disclaimer: Locator;

  constructor(private readonly page: Page) {
    this.heroHeading = page.getByRole('heading', {
      level: 1,
      name: /Entendé qué comés/i,
    });
    this.heroCta = page.getByTestId('hero-cta');
    this.howItWorksHeading = page.getByRole('heading', { level: 2, name: 'Cómo funciona' });
    this.examplesHeading = page.getByRole('heading', { level: 2, name: 'Ejemplos válidos' });
    this.historyCta = page.getByTestId('history-cta');
    this.sidebar = page.getByTestId('app-sidebar');
    this.disclaimer = page.getByRole('note');
  }

  async goto() {
    await this.page.goto('/');
    await expect(this.heroHeading).toBeVisible();
  }

  async expectHeroVisible() {
    await expect(this.heroHeading).toBeVisible();
    await expect(this.heroCta).toBeVisible();
    await expect(this.heroCta).toHaveAttribute('href', '/analizar');
  }

  async expectHowItWorksSection() {
    await expect(this.howItWorksHeading).toBeVisible();
    // 3 step labels — every one must be present
    await expect(this.page.getByText('Paso 1')).toBeVisible();
    await expect(this.page.getByText('Paso 2')).toBeVisible();
    await expect(this.page.getByText('Paso 3')).toBeVisible();
  }

  async expectExamplesSection() {
    await expect(this.examplesHeading).toBeVisible();
    await expect(
      this.page.getByRole('heading', { level: 3, name: 'Frente del producto' }),
    ).toBeVisible();
    await expect(
      this.page.getByRole('heading', { level: 3, name: 'Lista de ingredientes' }),
    ).toBeVisible();
    await expect(
      this.page.getByRole('heading', { level: 3, name: 'Tabla nutricional' }),
    ).toBeVisible();
  }

  async expectDisclaimer() {
    await expect(this.disclaimer).toContainText(/NutriLens es un asistente informativo/i);
  }

  /**
   * Sidebar is hidden on mobile (CSS `md:flex`), so this assertion only makes
   * sense on the chromium-desktop project.
   */
  async expectSidebarVisibleOnDesktop() {
    await expect(this.sidebar).toBeVisible();
  }

  async clickHeroCta() {
    await this.heroCta.click();
  }

  async expectUrl(pattern: RegExp) {
    await this.page.waitForURL(pattern);
  }

  async expectHistoryCtaHidden() {
    await expect(this.historyCta).toHaveCount(0);
  }
}
