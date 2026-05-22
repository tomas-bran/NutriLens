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
  private readonly noResults: Locator;
  private readonly noResultsClear: Locator;
  private readonly activeChips: Locator;

  constructor(private readonly page: Page) {
    this.view = page.getByTestId('history-view');
    this.grid = page.getByTestId('history-grid');
    this.empty = page.getByTestId('history-empty');
    this.noResults = page.getByTestId('history-no-results');
    this.noResultsClear = page.getByTestId('history-no-results-clear');
    this.activeChips = page.getByTestId('active-filter-chips');
  }

  async goto() {
    await this.page.goto('/historial');
    await expect(this.view).toBeVisible();
  }

  async expectGridVisible() {
    await expect(this.grid).toBeVisible();
  }

  async expectAtLeastNItems(n: number) {
    const items = this.page.locator('a[data-testid^="history-item-"]');
    await expect(items.nth(n - 1)).toBeVisible();
  }

  async expectExactlyNItems(n: number) {
    const items = this.page.locator('a[data-testid^="history-item-"]');
    await expect(items).toHaveCount(n);
  }

  async expectEmptyStateVisible() {
    await expect(this.empty).toBeVisible();
  }

  async expectNoResultsVisible() {
    await expect(this.noResults).toBeVisible();
  }

  async clickClearNoResults() {
    await this.noResultsClear.click();
  }

  /**
   * Selecciona un valor en un combobox de Radix Select. El trigger es un
   * `<button>`; el listbox aparece en un Portal con `data-testid` derivado
   * (`${triggerId}-content`) y cada opción tiene
   * `data-testid="${triggerId}-option-${value}"`. Se clickea el trigger
   * para abrir y luego la opción.
   */
  private async selectRadixOption(triggerTestId: string, value: string, expectedUrl: RegExp) {
    await this.page.getByTestId(triggerTestId).click();
    await this.page.getByTestId(`${triggerTestId}-option-${value}`).click();
    await this.page.waitForURL(expectedUrl);
  }

  async selectCategoria(value: string) {
    await this.selectRadixOption('history-filter-categoria', value, /categoria=/);
  }

  async selectRiesgo(value: string) {
    await this.selectRadixOption('history-filter-riesgo', value, /riesgo=/);
  }

  async selectAlergeno(value: string) {
    await this.selectRadixOption('history-filter-alergeno', value, /alergeno=/);
  }

  async selectApto(value: string) {
    await this.selectRadixOption('history-filter-apto', value, /apto=/);
  }

  async expectActiveChip(key: string) {
    await expect(this.page.getByTestId(`filter-chip-${key}`)).toBeVisible();
  }

  async expectNoActiveChips() {
    await expect(this.activeChips).toHaveCount(0);
  }

  async clickActiveChip(key: string) {
    await this.page.getByTestId(`filter-chip-${key}`).click();
  }

  async expectUrlHasParam(param: string, value: string) {
    await expect(this.page).toHaveURL(new RegExp(`[?&]${param}=${value}(?:&|$)`));
  }

  /**
   * Click the first product card and wait for the detail page.
   */
  async openFirstDetail() {
    const first = this.page.locator('a[data-testid^="history-item-"]').first();
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
