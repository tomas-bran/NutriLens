/**
 * Orquestador STREAMING del chat (NL-304). Async generator de `ChatStreamEvent`
 * que comparte `planChatResponse` con el camino no-streaming.
 *
 * Flujo:
 *   1. `meta` apenas el plan está listo (chips + intent + fallback ya pintan).
 *   2. `delta`* — tokens del LLM en vivo (answer o smalltalk). Para fallbacks
 *      canned se emite el texto completo en un solo `delta`.
 *   3. `suggestions` — pills contextuales, generadas tras la respuesta.
 *   4. `done` — texto sanitizado autoritativo + tokens.
 *
 * La sanitización opera sobre el texto COMPLETO: acumulamos los deltas crudos
 * (que el cliente muestra para el efecto en vivo) y en `done` mandamos el
 * texto sanitizado como fuente de verdad — el cliente reemplaza al cerrar.
 */
import { stripJsonFences } from '@/lib/ai/strip-json-fences';
import { logger } from '@/lib/logger';
import { generateSuggestions } from '@/lib/chat/generate-suggestions';
import { planChatResponse, type PlanChatDeps } from '@/lib/chat/plan-chat-response';
import { toChatProductRef } from '@/lib/chat/response';
import { sanitizeChatAnswer } from '@/lib/chat/sanitize-chat-answer';
import { toSavedProductLite } from '@/lib/chat/generate-answer';
import { SMALLTALK_PROMPT_VERSION } from '@/lib/chat/generate-smalltalk';
import { ANSWER_PROMPT_VERSION_DEFAULT } from '@/lib/chat/generate-answer';
import type { ChatStreamEvent } from '@/lib/chat/stream-events';

export type HandleChatStreamDeps = PlanChatDeps;

export async function* handleChatStream(
  rawQuestion: string,
  deps: HandleChatStreamDeps,
): AsyncGenerator<ChatStreamEvent> {
  const { ia, requestId } = deps;
  const plan = await planChatResponse(rawQuestion, deps);
  const { question, intent, parseTokens } = plan;

  if (plan.kind === 'fallback') {
    yield {
      type: 'meta',
      products: plan.products.map(toChatProductRef),
      intent,
      fallback: plan.fallback,
    };
    yield { type: 'delta', text: plan.answer };
    yield { type: 'suggestions', suggestions: null };
    yield { type: 'done', answer: plan.answer, tokensUsed: parseTokens };
    return;
  }

  // smalltalk (sin productos) y answer (con productos) comparten el mismo
  // mecanismo de streaming; cambian el prompt, el contexto y el log.
  const isSmalltalk = plan.kind === 'smalltalk';
  const products = isSmalltalk ? [] : plan.products;
  const lite = products.map(toSavedProductLite);

  yield {
    type: 'meta',
    products: products.map(toChatProductRef),
    intent,
    fallback: null,
  };

  const startedAt = Date.now();
  let raw = '';
  const stream = ia.answerWithContextStream(question, lite, {
    promptVersion: isSmalltalk ? SMALLTALK_PROMPT_VERSION : ANSWER_PROMPT_VERSION_DEFAULT,
    extra: isSmalltalk ? undefined : { intent_kind: intent.kind },
  });

  for await (const delta of stream) {
    raw += delta;
    yield { type: 'delta', text: delta };
  }

  const sanitized = sanitizeChatAnswer(stripJsonFences(raw));
  logger.info(isSmalltalk ? 'chat.smalltalk' : 'chat.answered', {
    requestId,
    answerLatencyMs: Date.now() - startedAt,
    products: products.length,
    streamed: true,
    sanitized: {
      matchedPatterns: sanitized.matchedPatterns,
      disclaimerAppended: sanitized.disclaimerAppended,
    },
  });

  const suggestions = await generateSuggestions(question, sanitized.text, lite, { ia });
  yield { type: 'suggestions', suggestions };
  yield { type: 'done', answer: sanitized.text, tokensUsed: parseTokens };
}
