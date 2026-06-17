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
   * En mobile los filtros viven en el bottomsheet — hay que abrirlo antes de
   * clickear el trigger de Radix. En desktop están inline y el botón "Filtros"
   * está oculto, así que el click es un no-op seguro.
   */
  private async openFiltersIfNeeded() {
    const openBtn = this.page.getByTestId('history-filter-open');
    if (await openBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await openBtn.click();
      await this.page.getByTestId('history-filter-categoria').waitFor({ state: 'visible' });
    }
  }

  private async closeFiltersIfNeeded() {
    const closeBtn = this.page.getByTestId('history-filter-close');
    if (await closeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await closeBtn.click();
    }
  }

  /**
   * Selecciona un valor en un combobox de Radix Select. Abre el bottomsheet
   * en mobile si hace falta, clickea el trigger, elige la opción y espera la URL.
   */
  private async selectRadixOption(triggerTestId: string, value: string, expectedUrl: RegExp) {
    await this.openFiltersIfNeeded();
    await this.page.getByTestId(triggerTestId).click();
    await this.page.getByTestId(`${triggerTestId}-option-${value}`).click();
    await this.page.waitForURL(expectedUrl);
    await this.closeFiltersIfNeeded();
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
