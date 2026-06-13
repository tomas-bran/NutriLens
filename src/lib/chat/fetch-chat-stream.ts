/**
 * Cliente del chat streaming (NL-304). Hace POST a `/api/chat/stream` y parsea
 * el `text/event-stream` con fetch + ReadableStream, invocando `onEvent` por
 * cada `ChatStreamEvent`. Aislado para testear con un fetch mockeado.
 *
 * Devuelve una promesa que resuelve cuando el stream cierra. Los errores de
 * negocio llegan como evento `{ type: 'error' }`; los de red rechazan.
 */
import type { ChatStreamEvent } from '@/lib/chat/stream-events';

export interface FetchChatStreamOptions {
  fetchImpl?: typeof fetch;
  requestId?: string;
  signal?: AbortSignal;
}

export async function fetchChatStream(
  question: string,
  onEvent: (event: ChatStreamEvent) => void,
  opts: FetchChatStreamOptions = {},
): Promise<void> {
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const rid = opts.requestId ?? safeUuid();

  const res = await fetchImpl('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Request-Id': rid },
    body: JSON.stringify({ question }),
    signal: opts.signal,
  });

  if (!res.body) {
    onEvent({
      type: 'error',
      error: 'internal_error',
      reason: 'El servidor no devolvió un stream.',
    });
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  // SSE: los eventos se separan por línea en blanco; cada uno trae `data: <json>`.
  // Acumulamos en `buffer` por si un chunk parte un evento al medio.
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep: number;
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const parsed = parseEvent(rawEvent);
      if (parsed) onEvent(parsed);
    }
  }
  const tail = parseEvent(buffer);
  if (tail) onEvent(tail);
}

function parseEvent(block: string): ChatStreamEvent | null {
  const line = block.split('\n').find((l) => l.startsWith('data:'));
  if (!line) return null;
  try {
    return JSON.parse(line.slice(5).trim()) as ChatStreamEvent;
  } catch {
    return null;
  }
}

function safeUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `req-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}
