/**
 * Cliente HTTP del chat. Aislado para que el page no haga `fetch` directo y
 * los tests puedan mockear con un `vi.spyOn(global, 'fetch')` o stubear esta
 * función entera.
 */
import type { ChatApiResponse } from '@/lib/chat/response';
import { ApiError, type ApiErrorBody } from '@schemas/errors';

export interface FetchChatOptions {
  /** Inyectable para tests; default `globalThis.fetch`. */
  fetchImpl?: typeof fetch;
  /** Header `X-Request-Id`; default `randomUUID()`. */
  requestId?: string;
}

export async function fetchChat(
  question: string,
  opts: FetchChatOptions = {},
): Promise<ChatApiResponse> {
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const rid = opts.requestId ?? safeUuid();

  const res = await fetchImpl('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Request-Id': rid },
    body: JSON.stringify({ question }),
  });

  if (!res.ok) {
    let body: ApiErrorBody;
    try {
      body = (await res.json()) as ApiErrorBody;
    } catch {
      throw new ApiError('internal_error', 'No pudimos contactar al servidor.', res.status);
    }
    throw new ApiError(body.error, body.reason, res.status, body.details);
  }

  return (await res.json()) as ChatApiResponse;
}

function safeUuid(): string {
  // crypto.randomUUID está en todo runtime moderno (browser + Node 19+).
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback ultra básico — usado solo si crypto no está disponible.
  return `req-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}
