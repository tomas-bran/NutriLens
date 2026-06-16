/**
 * E2E — Estado ERROR + retry (spec §9.4).
 *
 * El chat usa el endpoint streaming `POST /api/chat/stream` (NL-304): los
 * errores de negocio llegan como un evento SSE `data: {"type":"error",…}`.
 * Mockeamos la primera call con ese evento de error y dejamos pasar la segunda
 * al servidor real (MockIaProvider). Cubre que "Reintentar último mensaje"
 * reusa la última pregunta y que la respuesta exitosa limpia el banner.
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

  // Interceptamos la primera call al stream y emitimos un evento SSE de error;
  // las siguientes pasan al servidor real (MockIaProvider).
  let firstCall = true;
  await page.route('**/api/chat/stream', async (route) => {
    if (firstCall) {
      firstCall = false;
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: 'data: {"type":"error","error":"internal_error","reason":"Algo se rompió en el servidor."}\n\n',
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
