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

test('intent unknown → smalltalk del asistente SIN CTA de analizar (post 68d9e4b)', async ({
  page,
}) => {
  // El commit `68d9e4b feat(chat): smalltalk conversacional para intents
  // desconocidos` reemplazó el fallback canned "No te entendí bien" por una
  // call al LLM con el prompt `chat_smalltalk-v1`. El AC clave que sigue
  // valiendo es: NO hay productos en contexto, NO se muestra el CTA de
  // analizar, y la app responde con algo coherente (no rompe con 500).
  const chat = new ChatPage(page);
  await chat.goto();

  await chat.askQuestion('contame un chiste sobre el clima');

  // El asistente responde algo (MockIaProvider en CI devuelve un texto
  // canned con el disclaimer). Solo verificamos que el bubble se renderizó.
  await chat.expectAssistantMessagesCount(1);
  await chat.expectAnalyzeCtaHidden();
  await chat.expectProductChipsCount(0);
});
