/**
 * E2E — Analysis result screen (US-19, US-20).
 *
 * Flow: upload happy path → automatic redirect to `/analizar/[id]` → verify
 * every §6.1 block renders. Uses the MockIaProvider so the persisted product
 * carries deterministic fields (risk=bajo, confidence=0.9, no allergens).
 */
import { test } from '@playwright/test';
import { ResultPage } from './pages/result-page';
import { UploadPage } from './pages/upload-page';

test('tras analizar, llega a la pantalla y ve todos los bloques', async ({ page }) => {
  const upload = new UploadPage(page);
  const result = new ResultPage(page);

  await upload.goto();
  await upload.pickFile('etiqueta-valida.jpg');
  await upload.expectSelected('etiqueta-valida.jpg');
  await upload.submit();

  await result.waitUntilLoaded();
  await result.expectAllSectionsVisible();
  await result.expectRiskLevel('bajo');
});

test('el botón ← vuelve a /analizar', async ({ page }) => {
  const upload = new UploadPage(page);
  const result = new ResultPage(page);

  await upload.goto();
  await upload.pickFile('etiqueta-valida.jpg');
  await upload.submit();
  await result.waitUntilLoaded();

  await result.backToUpload();
});
