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
  private readonly dropzone: Locator;
  private readonly fileInput: Locator;
  private readonly submitButton: Locator;
  private readonly chooseOtherFileButton: Locator;
  private readonly uploadingState: Locator;
  private readonly processingState: Locator;
  private readonly progressBar: Locator;

  constructor(private readonly page: Page) {
    this.dropzone = page.getByTestId('dropzone');
    // The gallery input has the "Subir foto o PDF" aria-label; the camera and
    // PDF inputs have distinct labels. Targeting the gallery input keeps the
    // E2E behavior aligned with how users typically pick a saved image.
    this.fileInput = page.getByLabel('Subir foto o PDF');
    this.submitButton = page.getByRole('button', { name: 'Analizar producto' });
    this.chooseOtherFileButton = page.getByRole('button', { name: 'Elegir otro archivo' });
    this.uploadingState = page.getByTestId('uploading-state');
    this.processingState = page.getByTestId('processing-state');
    this.progressBar = page.getByRole('progressbar', { name: 'Progreso del análisis' });
  }

  async goto() {
    await this.page.goto('/analizar');
    // The page header h1 is `hidden md:flex`, so on mobile we anchor on the
    // dropzone instead (visible on every viewport).
    await expect(this.dropzone).toBeVisible();
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
   * Waits until the analysis kicked off. Con el mock + build de producción el
   * flujo puede pasar UPLOADING→PROCESSING→COMPLETED→redirect en milisegundos,
   * así que aceptamos cualquier etapa observable del trayecto (in-progress, el
   * skeleton del estado COMPLETED, o ya el resultado). La aserción estricta de
   * que terminó en el resultado la hace `expectRedirectToResult`.
   */
  async expectUploadInProgress() {
    await expect(
      this.uploadingState
        .or(this.processingState)
        .or(this.page.getByTestId('completed-state'))
        .or(this.page.getByTestId('result-view')),
    ).toBeVisible();
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
   * Wait until the URL changes and the result view mounts. We anchor on the
   * `result-view` testid (the heading now carries the product name).
   */
  async expectRedirectToResult() {
    await this.page.waitForURL(/\/analizar\/[^/]+$/, { timeout: 30_000 });
    await expect(this.page.getByTestId('result-view')).toBeVisible();
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
