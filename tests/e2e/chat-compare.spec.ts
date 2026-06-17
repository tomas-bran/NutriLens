/**
 * E2E — Comparación entre dos productos (US-31).
 *
 * Cubre:
 *   §1 ambos productos en DB → respuesta con tabla markdown contrastando
 *   §2 uno falta en DB → mensaje específico "no tengo X guardado" + CTA
 */
import { expect, test } from '@playwright/test';
import { ChatPage } from './pages/chat-page';
import {
  clearProducts,
  disconnect,
  seedChatCompareFixtures,
  seedChatOnlyOneForCompare,
} from './helpers/seed-chat';

test.afterAll(async () => {
  await disconnect();
});

test.describe('US-31 §1 — ambos productos en catálogo', () => {
  test.beforeAll(async () => {
    await clearProducts();
    await seedChatCompareFixtures();
  });

  test.afterAll(async () => {
    await clearProducts();
  });

  test('comparame X con Y → tabla markdown + chips para ambos', async ({ page }) => {
    const chat = new ChatPage(page);
    await chat.goto();

    await chat.askQuestion('comparame Galletitas X con Galletitas Y');

    await chat.expectAssistantMessagesCount(1);
    await chat.expectAssistantTableVisible();
    // Las dos columnas de la tabla deberían tener el nombre del producto.
    await expect(page.locator('th', { hasText: 'Galletitas X' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'Galletitas Y' })).toBeVisible();
    // Y los chips de los dos productos.
    await chat.expectProductChipsCount(2);
  });
});

test.describe('US-31 §2 — un producto falta en el catálogo', () => {
  test.beforeAll(async () => {
    await clearProducts();
    await seedChatOnlyOneForCompare();
  });

  test.afterAll(async () => {
    await clearProducts();
  });

  test('compare con un faltante → mensaje "no tengo X guardado" + CTA Analizar', async ({
    page,
  }) => {
    const chat = new ChatPage(page);
    await chat.goto();

    await chat.askQuestion('comparame Galletitas X con Cereales Fantasma');

    await chat.expectAssistantMessagesCount(1);
    await chat.expectMissingProductMessage('Cereales Fantasma');
    // NO debe haber tabla (atajamos antes del LLM).
    await chat.expectAssistantNoTable();
    // CTA "Analizar nuevo producto" visible (US-30 §2 / US-31 §2).
    await chat.expectAnalyzeCtaVisible();
    // El producto que SÍ está aparece como chip clickeable.
    await chat.expectProductChipsCount(1);
  });
});
