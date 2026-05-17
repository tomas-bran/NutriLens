import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Page Object for `/analizar/[id]` (result screen).
 * Spec: `docs/specs/E03 §6.1`. The screen is reached after a successful
 * upload from `/analizar`.
 */
export class ResultPage {
  private readonly view: Locator;
  private readonly title: Locator;
  private readonly riskBanner: Locator;
  private readonly aptitudes: Locator;
  private readonly explanationCard: Locator;
  private readonly disclaimer: Locator;

  constructor(private readonly page: Page) {
    this.view = page.getByTestId('result-view');
    this.title = page.getByTestId('result-title');
    this.riskBanner = page.getByTestId('risk-banner');
    this.aptitudes = page.getByTestId('aptitudes-chips');
    this.explanationCard = page.getByTestId('explanation-card');
    this.disclaimer = page.getByRole('note');
  }

  async waitUntilLoaded() {
    await this.page.waitForURL(/\/analizar\/[^/]+$/, { timeout: 30_000 });
    await expect(this.view).toBeVisible();
  }

  async expectAllSectionsVisible() {
    await expect(this.title).toBeVisible();
    await expect(this.riskBanner).toBeVisible();
    await expect(this.aptitudes).toBeVisible();
    await expect(this.explanationCard).toBeVisible();
    await expect(this.disclaimer).toContainText(/asistente informativo/i);
  }

  async expectRiskLevel(risk: 'bajo' | 'medio' | 'alto') {
    await expect(this.riskBanner).toHaveAttribute('data-risk', risk);
  }

  async backToUpload() {
    await this.page.getByTestId('result-back').click();
    await this.page.waitForURL(/\/analizar$/);
  }
}
