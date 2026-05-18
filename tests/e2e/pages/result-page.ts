import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Page Object for `/analizar/[id]` (result screen).
 * Spec: `docs/specs/E03 §6.1`. The screen is reached after a successful
 * upload from `/analizar`.
 */
export class ResultPage {
  private readonly view: Locator;
  private readonly title: Locator;
  private readonly riskBanner: Locator;
  private readonly aptitudes: Locator;
  private readonly explanationCard: Locator;
  private readonly disclaimer: Locator;
  private readonly jsonViewer: Locator;
  private readonly jsonToggle: Locator;
  private readonly jsonContent: Locator;
  private readonly jsonCopy: Locator;
  private readonly pipelineTrace: Locator;
  private readonly pipelineToggle: Locator;
  private readonly pipelineTotal: Locator;

  constructor(private readonly page: Page) {
    this.view = page.getByTestId('result-view');
    this.title = page.getByTestId('result-title');
    this.riskBanner = page.getByTestId('risk-banner');
    this.aptitudes = page.getByTestId('aptitudes-chips');
    this.explanationCard = page.getByTestId('explanation-card');
    this.disclaimer = page.getByRole('note');
    this.jsonViewer = page.getByTestId('json-viewer');
    this.jsonToggle = page.getByTestId('json-viewer-toggle');
    this.jsonContent = page.getByTestId('json-viewer-content');
    this.jsonCopy = page.getByTestId('json-viewer-copy');
    this.pipelineTrace = page.getByTestId('pipeline-trace');
    this.pipelineToggle = page.getByTestId('pipeline-trace-toggle');
    this.pipelineTotal = page.getByTestId('pipeline-trace-total');
  }

  async waitUntilLoaded() {
    await this.page.waitForURL(/\/analizar\/[^/]+$/, { timeout: 30_000 });
    await expect(this.view).toBeVisible();
  }

  async expectAllSectionsVisible() {
    await expect(this.title).toBeVisible();
    await expect(this.riskBanner).toBeVisible();
    await expect(this.aptitudes).toBeVisible();
    await expect(this.explanationCard).toBeVisible();
    await expect(this.disclaimer).toContainText(/asistente informativo/i);
  }

  async expectRiskLevel(risk: 'bajo' | 'medio' | 'alto') {
    await expect(this.riskBanner).toHaveAttribute('data-risk', risk);
  }

  async backToUpload() {
    await this.page.getByTestId('result-back').click();
    await this.page.waitForURL(/\/analizar$/);
  }

  // ─── US-33 / US-34 — Pipeline trace + JSON viewer ────────────────────────

  async expectJsonViewerVisible() {
    await expect(this.jsonViewer).toBeVisible();
  }

  async expectJsonInitiallyCollapsed() {
    // El cuerpo (content + copy) NO debe estar en el DOM antes de expandir.
    await expect(this.jsonContent).toHaveCount(0);
    await expect(this.jsonCopy).toHaveCount(0);
  }

  async openJsonViewer() {
    await this.jsonToggle.click();
    await expect(this.jsonContent).toBeVisible();
  }

  async expectJsonContains(text: string) {
    await expect(this.jsonContent).toContainText(text);
  }

  async clickCopyJson() {
    await this.jsonCopy.click();
  }

  async expectCopyFeedback() {
    await expect(this.jsonCopy).toContainText('¡Copiado!');
  }

  async expectPipelineTraceVisible() {
    await expect(this.pipelineTrace).toBeVisible();
  }

  async openPipelineTrace() {
    // En desktop ya está abierto por default. Si está cerrado, lo abrimos.
    const expanded = await this.pipelineToggle.getAttribute('aria-expanded');
    if (expanded !== 'true') await this.pipelineToggle.click();
    await expect(this.pipelineTotal).toBeVisible();
  }

  async expectPipelineHasStep(stepName: string) {
    await expect(this.page.getByTestId(`pipeline-step-${stepName}`)).toBeVisible();
  }

  async expectPipelineTotalFormat() {
    // Acepta "12 ms", "1.23 s", etc. — no asertamos el valor exacto.
    await expect(this.pipelineTotal).toHaveText(/^\d+(\.\d+)?\s+(ms|s)$/);
  }
}
