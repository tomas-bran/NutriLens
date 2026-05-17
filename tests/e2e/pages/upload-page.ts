import path from 'node:path';
import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

const FIXTURES_DIR = path.resolve(__dirname, '..', 'fixtures');

/**
 * Page Object for `/analizar` (the upload flow page).
 *
 * Every selector seen in the upload-* specs goes through here. When the
 * dropzone DOM changes, only this file should need updates.
 */
export class UploadPage {
  private readonly heading: Locator;
  private readonly dropzone: Locator;
  private readonly fileInput: Locator;
  private readonly submitButton: Locator;
  private readonly chooseOtherFileButton: Locator;
  private readonly uploadingState: Locator;
  private readonly processingState: Locator;
  private readonly progressBar: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: '¿Qué vamos a analizar hoy?' });
    this.dropzone = page.getByTestId('dropzone');
    // The gallery input has the "Subir foto o PDF" aria-label; the camera and
    // PDF inputs have distinct labels. Targeting the gallery input keeps the
    // E2E behavior aligned with how users typically pick a saved image.
    this.fileInput = page.getByLabel('Subir foto o PDF');
    this.submitButton = page.getByRole('button', { name: 'Analizar producto' });
    this.chooseOtherFileButton = page.getByRole('button', { name: 'Elegir otro archivo' });
    this.uploadingState = page.getByTestId('uploading-state');
    this.processingState = page.getByTestId('processing-state');
    this.progressBar = page.getByRole('progressbar', { name: 'Progreso del upload' });
  }

  async goto() {
    await this.page.goto('/analizar');
    await expect(this.heading).toBeVisible();
  }

  async expectDropzoneVisible() {
    await expect(this.dropzone).toBeVisible();
  }

  async pickFile(fixtureName: string) {
    await this.fileInput.setInputFiles(path.join(FIXTURES_DIR, fixtureName));
  }

  async expectSelected(filename: string) {
    await expect(this.page.getByText('Archivo cargado')).toBeVisible();
    await expect(this.page.getByText(filename, { exact: true })).toBeVisible();
    await expect(this.submitButton).toBeEnabled();
  }

  async submit() {
    await this.submitButton.click();
  }

  /**
   * Waits until either the UPLOADING or PROCESSING state is visible.
   * On fast networks the UPLOADING phase is too brief to assert, so we
   * accept either as proof that the submit kicked off.
   */
  async expectUploadInProgress() {
    await expect(this.uploadingState.or(this.processingState)).toBeVisible();
  }

  async expectProcessingState() {
    await expect(this.processingState).toBeVisible();
    await expect(this.page.getByText('Procesando imagen…')).toBeVisible();
  }

  async expectProgressBar() {
    await expect(this.progressBar).toBeVisible();
  }

  /**
   * After a successful analysis, the flow navigates to `/analizar/[id]`.
   * Wait until the URL changes and the result heading shows up.
   */
  async expectRedirectToResult() {
    await this.page.waitForURL(/\/analizar\/[^/]+$/, { timeout: 30_000 });
    await expect(this.page.getByRole('heading', { name: 'Análisis completado' })).toBeVisible();
  }

  async expectErrorState(title: string) {
    await expect(this.page.getByRole('heading', { name: title })).toBeVisible();
  }

  async expectErrorActionButton(label: string) {
    await expect(this.page.getByRole('button', { name: label })).toBeVisible();
  }

  async clickErrorAction(label: string) {
    await this.page.getByRole('button', { name: label }).click();
  }

  async chooseAnotherFile() {
    await this.chooseOtherFileButton.click();
  }
}
