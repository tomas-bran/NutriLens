/**
 * E2E — Upload rejected by client-side validation (US-01 §AC2, US-06).
 *
 * Cubre el escenario 2 de US-01 (formato no soportado) y los AC de US-06:
 * la UI muestra el `<ErrorState>` con título legible + botón de acción.
 */
import { test } from '@playwright/test';
import { UploadPage } from './pages/upload-page';

test('drop de .docx muestra ErrorState "Formato no soportado" con botón de acción', async ({
  page,
}) => {
  const uploadPage = new UploadPage(page);

  await uploadPage.goto();
  await uploadPage.expectDropzoneVisible();

  await uploadPage.pickFile('documento.docx');

  await uploadPage.expectErrorState('Formato no soportado');
  await uploadPage.expectErrorActionButton('Probar con otro archivo');
});

test('"Probar con otro archivo" devuelve al dropzone IDLE', async ({ page }) => {
  const uploadPage = new UploadPage(page);

  await uploadPage.goto();
  await uploadPage.pickFile('documento.docx');
  await uploadPage.expectErrorState('Formato no soportado');

  await uploadPage.clickErrorAction('Probar con otro archivo');

  await uploadPage.expectDropzoneVisible();
});
