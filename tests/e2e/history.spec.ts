/**
 * E2E — Catálogo (US-23, US-26).
 *
 * Cubre el flujo end-to-end: analizar un producto → verlo en /catalogo
 * → abrir su detalle. Usa el mock provider (env por playwright.config) así
 * que el flow es reproducible sin tokens reales.
 */
import { test } from '@playwright/test';
import { HistoryPage } from './pages/history-page';
import { UploadPage } from './pages/upload-page';

test('analizar un producto → verlo en /catalogo → abrir detalle', async ({ page }) => {
  const upload = new UploadPage(page);
  const history = new HistoryPage(page);

  // 1) Subir un producto via /analizar
  await upload.goto();
  await upload.pickFile('etiqueta-valida.jpg');
  await upload.submit();
  await upload.expectRedirectToResult();

  // 2) Ir a /catalogo — el producto recién analizado debe estar arriba
  await history.goto();
  await history.expectGridVisible();
  await history.expectAtLeastNItems(1);

  // 3) Abrir el detalle de la primera card
  await history.openFirstDetail();
  await history.expectDetailContext('Producto guardado');

  // 4) El back link vuelve al listado
  await history.backToHistoryFromDetail();
});
