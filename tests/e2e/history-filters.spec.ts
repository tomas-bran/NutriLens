/**
 * E2E — Filtros del historial (US-24).
 *
 * Cubre los 3 escenarios pedidos:
 *  - aplicar `categoria=galletitas` → la lista se filtra.
 *  - combinar 2 filtros → AND (sólo aparecen rows que cumplen ambos).
 *  - combinación sin resultados → mensaje + botón Limpiar.
 *
 * El seed inserta 5 productos deterministas via Prisma; cada test arranca
 * limpiando la tabla así no contamina ni se contamina con otros specs.
 */
import { test, expect } from '@playwright/test';
import { clearHistory, disconnect, seedFilterFixture } from './helpers/seed-history';
import { HistoryPage } from './pages/history-page';

test.describe('Filtros del historial (US-24)', () => {
  test.beforeEach(async () => {
    await clearHistory();
    await seedFilterFixture();
  });

  test.afterAll(async () => {
    await clearHistory();
    await disconnect();
  });

  test('aplicar filtro categoría=galletitas → la lista se filtra', async ({ page }) => {
    const history = new HistoryPage(page);
    await history.goto();
    await history.expectAtLeastNItems(5);

    await history.selectCategoria('galletitas');
    await history.expectUrlHasParam('categoria', 'galletitas');
    // El fixture tiene exactamente 2 galletitas (Choco y Limón).
    await history.expectExactlyNItems(2);
    await history.expectActiveChip('categoria');
    await expect(page.getByText('Galletitas Choco')).toBeVisible();
    await expect(page.getByText('Galletitas Limón')).toBeVisible();
    await expect(page.getByText('Snack de papa')).not.toBeVisible();
  });

  test('combinar 2 filtros: categoría + riesgo aplica AND', async ({ page }) => {
    const history = new HistoryPage(page);
    await history.goto();

    await history.selectCategoria('galletitas');
    await history.selectRiesgo('alto');

    // De las dos galletitas sólo "Choco" tiene riesgo alto.
    await history.expectExactlyNItems(1);
    await expect(page.getByText('Galletitas Choco')).toBeVisible();
    await expect(page.getByText('Galletitas Limón')).not.toBeVisible();
    await history.expectActiveChip('categoria');
    await history.expectActiveChip('riesgo');
  });

  test('combinación sin resultados → muestra mensaje + botón Limpiar funciona', async ({
    page,
  }) => {
    const history = new HistoryPage(page);
    await history.goto();

    // cereales + alérgeno leche → ninguno (los cereales del seed no tienen leche).
    await history.selectCategoria('cereales');
    await history.selectAlergeno('leche');

    await history.expectNoResultsVisible();
    await history.clickClearNoResults();

    // Volvimos al listado sin filtros, todos los seeds visibles.
    await page.waitForURL(/\/historial$/);
    await history.expectGridVisible();
    await history.expectAtLeastNItems(5);
    await history.expectNoActiveChips();
  });

  test('quitar un chip de filtro recompone la URL y refiltra', async ({ page }) => {
    const history = new HistoryPage(page);
    await history.goto();
    await history.selectCategoria('galletitas');
    await history.expectExactlyNItems(2);

    await history.clickActiveChip('categoria');
    await page.waitForURL(/\/historial$/);
    await history.expectAtLeastNItems(5);
  });
});
