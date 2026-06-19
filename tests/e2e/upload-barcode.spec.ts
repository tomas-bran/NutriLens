/**
 * E2E — Analizar con dos fotos: producto + código de barras (NL-601).
 *
 * El código de barras es OPCIONAL: el usuario puede subir solo el producto
 * (flujo de siempre) o además la foto del código para un análisis más preciso.
 * Acá cubrimos el camino de las dos fotos end-to-end. Mock provider + OFF
 * deshabilitado en E2E (ver playwright.config) → reproducible sin tokens.
 */
import { test } from '@playwright/test';
import { UploadPage } from './pages/upload-page';

test('analizar con foto del producto + código de barras → resultado', async ({ page }) => {
  const upload = new UploadPage(page);
  await upload.goto();

  // Slot opcional: cargamos también la foto del código de barras.
  await upload.pickBarcode('etiqueta-valida.jpg');
  await upload.expectBarcodeSelected();

  // Foto del producto (requerida) y analizar las dos.
  await upload.pickFile('etiqueta-valida.jpg');
  await upload.submit();

  // El flujo de las dos fotos termina en el resultado igual que el de una.
  await upload.expectRedirectToResult();
});
