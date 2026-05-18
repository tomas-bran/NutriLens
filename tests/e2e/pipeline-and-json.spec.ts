/**
 * E2E — PipelineTrace + JsonViewer en la pantalla de resultado (US-33, US-34).
 *
 * Flow: subo una etiqueta → llego a `/analizar/[id]` → abro el JSON colapsable
 * y verifico que tiene el JSON pretty-printed → abro el pipeline y verifico
 * que aparecen los 8 steps + total.
 */
import { test } from '@playwright/test';
import { ResultPage } from './pages/result-page';
import { UploadPage } from './pages/upload-page';

test.describe('US-34 — JSON extraído colapsable', () => {
  test('arranca cerrado y al expandir muestra el JSON con copiar', async ({ page }) => {
    const upload = new UploadPage(page);
    const result = new ResultPage(page);

    await upload.goto();
    await upload.pickFile('etiqueta-valida.jpg');
    await upload.submit();
    await result.waitUntilLoaded();

    await result.expectJsonViewerVisible();
    await result.expectJsonInitiallyCollapsed();

    await result.openJsonViewer();
    // El MockIaProvider produce un producto con `"producto":"Mock Product"`.
    await result.expectJsonContains('producto');
    await result.expectJsonContains('Mock Product');

    await result.clickCopyJson();
    await result.expectCopyFeedback();
  });
});

test.describe('US-33 — Pipeline del análisis visible', () => {
  test('lista los steps con duración y total', async ({ page }) => {
    const upload = new UploadPage(page);
    const result = new ResultPage(page);

    await upload.goto();
    await upload.pickFile('etiqueta-valida.jpg');
    await upload.submit();
    await result.waitUntilLoaded();

    await result.expectPipelineTraceVisible();
    await result.openPipelineTrace();

    // Los 8 steps del pipeline post-extracción aparecen (E06 §3.1).
    await result.expectPipelineHasStep('validate_file');
    await result.expectPipelineHasStep('detect_label_kind');
    await result.expectPipelineHasStep('extract_with_ia');
    await result.expectPipelineHasStep('validate_schema');
    await result.expectPipelineHasStep('apply_rules');
    await result.expectPipelineHasStep('compute_risk');
    await result.expectPipelineHasStep('generate_explanation');
    await result.expectPipelineHasStep('persist');

    await result.expectPipelineTotalFormat();
  });
});
