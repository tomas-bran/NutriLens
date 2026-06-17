/**
 * E2E — Chat con contexto (US-27 §1, US-28 §1, US-29 §1+§2, US-32 §1+§2).
 *
 * DB seedeada con 3 galletitas (2 aptas celíacos) → pregunta canónica del spec
 * → chips referenciados → click en chip → detalle del producto.
 */
import { expect, test } from '@playwright/test';
import { ChatPage } from './pages/chat-page';
import { clearProducts, disconnect, seedChatGalletitasAptas } from './helpers/seed-chat';

test.beforeAll(async () => {
  await clearProducts();
  await seedChatGalletitasAptas();
});

test.afterAll(async () => {
  await clearProducts();
  await disconnect();
});

test('pregunta con contexto → respuesta + chips → click en chip → detalle (US-32)', async ({
  page,
}) => {
  const chat = new ChatPage(page);
  await chat.goto();
  await chat.expectHeaderProductsCount(3);

  await chat.askQuestion('mostrame galletitas aptas para celíacos');

  // 2 productos del seed son aptos celíacos → 2 chips visibles (US-32 §1).
  await chat.expectAssistantMessagesCount(1);
  await chat.expectProductChipsCount(2);

  // El disclaimer del chat debe estar presente en la respuesta (US-29 §2).
  await chat.expectAssistantAnswerContains('NutriLens es un asistente informativo');

  // Click en el primer chip navega al detalle del producto (US-32 §2).
  await chat.clickProductChip(0);
  await expect(page).toHaveURL(/\/catalogo\/[0-9a-f-]+/);
});
