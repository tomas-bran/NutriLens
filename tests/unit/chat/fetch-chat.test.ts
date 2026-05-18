/**
 * Tests del cliente HTTP del chat. Inyectamos `fetchImpl` para no tocar red.
 */
import { describe, it, expect, vi } from 'vitest';
import { ApiError } from '@schemas/errors';
import { fetchChat } from '@/lib/chat/fetch-chat';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('fetchChat', () => {
  it('POSTea al /api/chat con question + JSON content type + request id', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        answer: 'ok',
        products: [],
        intent: { kind: 'unknown' },
        tokensUsed: { in: 0, out: 0 },
        fallback: null,
      }),
    );
    await fetchChat('mostrame galletitas', {
      fetchImpl,
      requestId: '11111111-2222-3333-4444-555555555555',
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/chat',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ question: 'mostrame galletitas' }),
      }),
    );
    const init = fetchImpl.mock.calls[0]![1] as RequestInit;
    expect(init.headers).toMatchObject({
      'Content-Type': 'application/json',
      'X-Request-Id': '11111111-2222-3333-4444-555555555555',
    });
  });

  it('200 OK → devuelve el JSON tipado', async () => {
    const expected = {
      answer: 'Tenés 1 producto.',
      products: [],
      intent: {
        kind: 'filter',
        categoria: 'galletitas',
        riesgo_max: null,
        apto: null,
        alergeno_excluido: null,
        keywords: [],
        comparar: [],
      },
      tokensUsed: { in: 80, out: 22 },
      fallback: null,
    };
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, expected));
    const r = await fetchChat('x', { fetchImpl });
    expect(r).toEqual(expected);
  });

  it('400 invalid_question → lanza ApiError con el code del back', async () => {
    // Importante: un `Response` solo se puede leer una vez, así que generamos
    // uno nuevo por cada call con `.mockImplementation`.
    const fetchImpl = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(jsonResponse(400, { error: 'invalid_question', reason: 'vacía' })),
      );
    const err = await fetchChat('', { fetchImpl }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ code: 'invalid_question', httpStatus: 400 });
  });

  it('500 con body no-JSON → ApiError internal_error', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response('Internal Server Error', { status: 500 }));
    await expect(fetchChat('x', { fetchImpl })).rejects.toMatchObject({
      code: 'internal_error',
      httpStatus: 500,
    });
  });

  it('429 model_rate_limited → propaga code + reason', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(429, {
          error: 'model_rate_limited',
          reason: 'El servicio está saturado.',
        }),
      );
    await expect(fetchChat('x', { fetchImpl })).rejects.toMatchObject({
      code: 'model_rate_limited',
      reason: 'El servicio está saturado.',
    });
  });
});
