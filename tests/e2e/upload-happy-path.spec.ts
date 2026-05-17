/**
 * E2E — Upload happy path (US-01, US-04).
 *
 * Cubre el escenario 1 de US-01 (subida exitosa de imagen JPG) y los
 * escenarios visuales de US-04 ("Archivo cargado" → "Procesando" →
 * redirect al resultado). Usa `MockIaProvider` (env de playwright.config),
 * así que no consume tokens.
 */
import { test } from '@playwright/test';
import { UploadPage } from './pages/upload-page';

test('subir un JPG válido muestra "Procesando" y redirige a /analizar/[id]', async ({ page }) => {
  const uploadPage = new UploadPage(page);

  await uploadPage.goto();
  await uploadPage.expectDropzoneVisible();

  await uploadPage.pickFile('etiqueta-valida.jpg');
  await uploadPage.expectSelected('etiqueta-valida.jpg');

  await uploadPage.submit();

  // The browser may zip past UPLOADING on localhost — assert we entered
  // *some* in-progress state (uploading OR processing).
  await uploadPage.expectUploadInProgress();

  await uploadPage.expectRedirectToResult();
});
