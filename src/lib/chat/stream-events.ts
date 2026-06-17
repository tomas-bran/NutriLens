/**
 * Protocolo de eventos SSE del chat streaming (NL-304). Compartido por el
 * server (`handle-chat-stream`) y el cliente (`fetch-chat-stream`) para que el
 * contrato sea único.
 *
 * Secuencia típica:
 *   meta → delta* → suggestions? → done
 * En error en cualquier punto: `error` (terminal).
 */
import type { ChatFallback } from '@/lib/chat/empty-response';
import type { ChatIntent } from '@/lib/chat/intent-schema';
import type { ChatProductRef } from '@/lib/chat/response';

export type ChatStreamEvent =
  /** Una vez resuelto el plan: chips + intent + fallback ya pueden pintarse. */
  | { type: 'meta'; products: ChatProductRef[]; intent: ChatIntent; fallback: ChatFallback | null }
  /** Fragmento incremental de la respuesta. */
  | { type: 'delta'; text: string }
  /** Pills contextuales (tras completar la respuesta). */
  | { type: 'suggestions'; suggestions: string[] | null }
  /** Cierre OK: `answer` es el texto sanitizado autoritativo. */
  | { type: 'done'; answer: string; tokensUsed: { in: number; out: number } }
  /** Cierre con error (terminal). */
  | { type: 'error'; error: string; reason: string };

/** Serializa un evento al formato SSE (`data: <json>\n\n`). */
export function encodeStreamEvent(event: ChatStreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}
