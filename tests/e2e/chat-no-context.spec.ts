/**
 * E2E — Chat sin contexto (US-30 §1 + §2 + E05 §8).
 *
 * DB vacía → pregunta cualquiera → mensaje "No tengo productos guardados..."
 * + CTA "Analizar nuevo producto" que linkea a /analizar.
 */
import { test } from '@playwright/test';
import { ChatPage } from './pages/chat-page';
import { clearProducts, disconnect } from './helpers/seed-chat';

test.beforeAll(async () => {
  await clearProducts();
});

test.afterAll(async () => {
  await disconnect();
});

test('DB vacía + pregunta → fallback "no_context" + CTA Analizar nuevo producto', async ({
  page,
}) => {
  const chat = new ChatPage(page);
  await chat.goto();
  await chat.expectHeroVisible();
  await chat.expectHeaderProductsCount(0);

  await chat.askQuestion('mostrame galletitas aptas para celíacos');

  await chat.expectAssistantAnswerContains('No tengo productos guardados');
  await chat.expectProductChipsCount(0);
  await chat.expectAnalyzeCtaVisible();
});

test('intent unknown → mensaje fallback "No te entendí bien" SIN CTA de analizar', async ({
  page,
}) => {
  const chat = new ChatPage(page);
  await chat.goto();

  await chat.askQuestion('contame un chiste sobre el clima');

  await chat.expectAssistantAnswerContains('No te entendí bien');
  await chat.expectAnalyzeCtaHidden();
});
