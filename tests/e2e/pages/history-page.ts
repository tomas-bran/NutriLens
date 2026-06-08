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
  private readonly categoriaSelect: Locator;
  private readonly riesgoSelect: Locator;
  private readonly alergenoSelect: Locator;
  private readonly aptoSelect: Locator;
  private readonly activeChips: Locator;
  // NL-502: en mobile los filtros viven en un bottomsheet detrás de "Filtros".
  private readonly filterOpenBtn: Locator;
  private readonly filterCloseBtn: Locator;

  constructor(private readonly page: Page) {
    this.view = page.getByTestId('history-view');
    this.grid = page.getByTestId('history-grid');
    this.empty = page.getByTestId('history-empty');
    this.noResults = page.getByTestId('history-no-results');
    this.noResultsClear = page.getByTestId('history-no-results-clear');
    this.categoriaSelect = page.getByTestId('history-filter-categoria');
    this.riesgoSelect = page.getByTestId('history-filter-riesgo');
    this.alergenoSelect = page.getByTestId('history-filter-alergeno');
    this.aptoSelect = page.getByTestId('history-filter-apto');
    this.activeChips = page.getByTestId('active-filter-chips');
    this.filterOpenBtn = page.getByTestId('history-filter-open');
    this.filterCloseBtn = page.getByTestId('history-filter-close');
  }

  /**
   * En desktop los selects están inline (siempre visibles). En mobile están
   * dentro del bottomsheet: si no se ven, lo abrimos tocando "Filtros".
   */
  private async openFiltersIfMobile() {
    if (await this.categoriaSelect.isVisible()) return;
    await this.filterOpenBtn.click();
    await expect(this.categoriaSelect).toBeVisible();
  }

  /**
   * Cierra el bottomsheet si quedó abierto (mobile), así no tapa el contenido
   * del listado al hacer las aserciones siguientes. En desktop es un no-op
   * (el botón de cerrar es `md:hidden`).
   */
  private async closeFiltersIfOpen() {
    if (await this.filterCloseBtn.isVisible()) {
      await this.filterCloseBtn.click();
      await expect(this.filterCloseBtn).toBeHidden();
    }
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

  async selectCategoria(value: string) {
    await this.openFiltersIfMobile();
    await this.categoriaSelect.selectOption(value);
    await this.page.waitForURL(/categoria=/);
    await this.closeFiltersIfOpen();
  }

  async selectRiesgo(value: string) {
    await this.openFiltersIfMobile();
    await this.riesgoSelect.selectOption(value);
    await this.page.waitForURL(/riesgo=/);
    await this.closeFiltersIfOpen();
  }

  async selectAlergeno(value: string) {
    await this.openFiltersIfMobile();
    await this.alergenoSelect.selectOption(value);
    await this.page.waitForURL(/alergeno=/);
    await this.closeFiltersIfOpen();
  }

  async selectApto(value: string) {
    await this.openFiltersIfMobile();
    await this.aptoSelect.selectOption(value);
    await this.page.waitForURL(/apto=/);
    await this.closeFiltersIfOpen();
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
