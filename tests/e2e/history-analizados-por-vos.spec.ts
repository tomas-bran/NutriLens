/**
 * E2E — Catálogo: filtro "Analizados por vos".
 *
 * El catálogo es una base compartida. El switch "Analizados por vos" limita el
 * listado a los productos que ESTE usuario analizó (vínculo ProductAnalysis,
 * que el flujo de /analizar crea de ahora en adelante). El seed inserta 5
 * productos que NO están vinculados a nadie → sirven de control negativo: no
 * deben aparecer bajo "Analizados por vos".
 */
import { test, expect } from '@playwright/test';
import { clearHistory, disconnect, seedFilterFixture } from './helpers/seed-history';
import { HistoryPage } from './pages/history-page';
import { UploadPage } from './pages/upload-page';

test.describe('Catálogo — Analizados por vos', () => {
  test.beforeEach(async () => {
    await clearHistory();
    await seedFilterFixture();
  });

  test.afterAll(async () => {
    await clearHistory();
    await disconnect();
  });

  test('"Analizados por vos" muestra solo lo que el usuario analizó', async ({ page }) => {
    const upload = new UploadPage(page);
    const history = new HistoryPage(page);

    // 1) El usuario analiza un producto → queda vinculado a él.
    await upload.goto();
    await upload.pickFile('etiqueta-valida.jpg');
    await upload.submit();
    await upload.expectRedirectToResult();

    // 2) "Todos" muestra el catálogo compartido: 5 del seed + el recién analizado.
    await history.goto();
    await history.expectGridVisible();
    await history.expectAtLeastNItems(6);
    await expect(page.getByText('Galletitas Choco')).toBeVisible();

    // 3) "Analizados por vos" → solo el producto que este usuario analizó.
    await history.showAnalizadosPorVos();
    await history.expectScopeMiosActive();
    await history.expectExactlyNItems(1);
    // Los productos del seed (no vinculados) desaparecen.
    await expect(page.getByText('Galletitas Choco')).not.toBeVisible();

    // 4) Volver a "Todos" restaura el catálogo completo.
    await history.showTodos();
    await history.expectAtLeastNItems(6);
  });
});
