/**
 * E2E — Estado ERROR + retry (spec §9.4).
 *
 * Mockeamos `POST /api/chat` via `page.route` para forzar primero un 500 y
 * luego un 200 OK. Esto cubre que el botón "Reintentar último mensaje" reusa
 * la última pregunta y que la respuesta exitosa limpia el banner.
 */
import { expect, test } from '@playwright/test';
import { ChatPage } from './pages/chat-page';
import { clearProducts, disconnect } from './helpers/seed-chat';

test.beforeAll(async () => {
  await clearProducts();
});

test.afterAll(async () => {
  await disconnect();
});

test('error 500 del backend → banner con retry → retry reusa la pregunta y muestra respuesta', async ({
  page,
}) => {
  const chat = new ChatPage(page);

  // Interceptamos la primera call al endpoint y le metemos 500; las siguientes
  // pasan al servidor real (MockIaProvider).
  let firstCall = true;
  await page.route('**/api/chat', async (route) => {
    if (firstCall) {
      firstCall = false;
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'internal_error',
          reason: 'Algo se rompió en el servidor.',
        }),
      });
      return;
    }
    await route.continue();
  });

  await chat.goto();
  await chat.askQuestion('mostrame galletitas');

  await chat.expectErrorVisible('Algo se rompió');
  await chat.expectAssistantMessagesCount(0);

  await chat.clickRetry();

  await chat.expectAssistantMessagesCount(1);
  await expect(page.getByTestId('chat-error')).toBeHidden();
});
