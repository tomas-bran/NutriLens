import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Page Object for `/historial` and `/historial/[id]`.
 * Spec: `docs/specs/E04 §6` (US-23, US-26).
 */
export class HistoryPage {
  private readonly view: Locator;
  private readonly grid: Locator;
  private readonly empty: Locator;

  constructor(private readonly page: Page) {
    this.view = page.getByTestId('history-view');
    this.grid = page.getByTestId('history-grid');
    this.empty = page.getByTestId('history-empty');
  }

  async goto() {
    await this.page.goto('/historial');
    await expect(this.view).toBeVisible();
  }

  async expectGridVisible() {
    await expect(this.grid).toBeVisible();
  }

  async expectAtLeastNItems(n: number) {
    const items = this.page.locator('[data-testid^="history-item-"]');
    await expect(items.nth(n - 1)).toBeVisible();
  }

  async expectEmptyStateVisible() {
    await expect(this.empty).toBeVisible();
  }

  /**
   * Click the first product card and wait for the detail page.
   */
  async openFirstDetail() {
    const first = this.page.locator('[data-testid^="history-item-"]').first();
    await first.click();
    await this.page.waitForURL(/\/historial\/[^/]+$/);
    await expect(this.page.getByTestId('result-view')).toBeVisible();
  }

  async expectDetailContext(label: string) {
    await expect(this.page.getByTestId('result-context')).toHaveText(label);
  }

  async backToHistoryFromDetail() {
    await this.page.getByTestId('result-back').click();
    await this.page.waitForURL(/\/historial$/);
  }
}
