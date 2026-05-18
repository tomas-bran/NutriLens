/**
 * E2E — Thread persistente en sesión (US-27 §2) + reset (US-27 §3) +
 * disparo de pregunta desde una sugerencia (spec §9.5).
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

test('2 preguntas seguidas: ambos pares user/assistant siguen visibles (US-27 §2)', async ({
  page,
}) => {
  const chat = new ChatPage(page);
  await chat.goto();

  await chat.askQuestion('mostrame galletitas');
  await chat.expectAssistantMessagesCount(1);

  await chat.askQuestion('mostrame snacks');
  await chat.expectUserMessagesCount(2);
  await chat.expectAssistantMessagesCount(2);
});

test('"Nueva conversación" limpia el thread y vuelve al hero (US-27 §3)', async ({ page }) => {
  const chat = new ChatPage(page);
  await chat.goto();
  await chat.expectNewConversationDisabled();

  await chat.askQuestion('mostrame productos');
  await chat.expectAssistantMessagesCount(1);
  await chat.expectNewConversationEnabled();

  await chat.clickNewConversation();

  await chat.expectHeroVisible();
  await chat.expectUserMessagesCount(0);
  await chat.expectAssistantMessagesCount(0);
});

test('click en una sugerencia inicial dispara el flujo de envío (spec §9.5)', async ({ page }) => {
  const chat = new ChatPage(page);
  await chat.goto();
  await chat.expectHeroVisible();

  await chat.clickSuggestion(0);

  await chat.expectHeroHidden();
  await chat.expectAssistantMessagesCount(1);
});
