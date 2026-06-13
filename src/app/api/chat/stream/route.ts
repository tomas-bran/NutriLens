/**
 * POST /api/chat/stream — variante streaming (SSE) del chat (NL-304).
 *
 * Devuelve un `text/event-stream` con eventos `ChatStreamEvent`. El cliente
 * (`fetch-chat-stream`) los consume con fetch + ReadableStream. El endpoint
 * no-streaming (`/api/chat`) queda como fallback para clientes sin streaming
 * y para los tests de integración existentes.
 */
import { type NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { ApiError } from '@schemas/errors';
import { getIaProvider } from '@/lib/ai';
import { handleChatStream } from '@/lib/chat/handle-chat-stream';
import { encodeStreamEvent, type ChatStreamEvent } from '@/lib/chat/stream-events';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest): Promise<Response> {
  const requestId = pickRequestId(request.headers.get('x-request-id'));

  let question: unknown;
  try {
    const body = await request.json();
    question =
      typeof body === 'object' && body !== null && 'question' in body
        ? (body as { question: unknown }).question
        : undefined;
  } catch {
    return errorStream(
      'invalid_question',
      'Body inválido: enviá un JSON con `question`.',
      requestId,
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: ChatStreamEvent) => controller.enqueue(encoder.encode(encodeStreamEvent(e)));
      try {
        for await (const event of handleChatStream(question as string, {
          ia: getIaProvider(),
          requestId,
        })) {
          send(event);
        }
      } catch (err) {
        const { error, reason } = toClientError(err);
        logger.warn('chat.stream_error', { requestId, error, reason });
        send({ type: 'error', error, reason });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Request-Id': requestId,
    },
  });
}

/** Un único evento `error` para fallos previos a abrir el stream principal. */
function errorStream(error: string, reason: string, requestId: string): Response {
  const body = encodeStreamEvent({ type: 'error', error, reason });
  return new Response(body, {
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'X-Request-Id': requestId },
  });
}

function toClientError(err: unknown): { error: string; reason: string } {
  if (err instanceof ApiError) return { error: err.code, reason: err.reason };
  return { error: 'internal_error', reason: 'Algo salió mal generando la respuesta.' };
}

function pickRequestId(header: string | null): string {
  if (header && UUID_RE.test(header)) return header.toLowerCase();
  return randomUUID();
}
