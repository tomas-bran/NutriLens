/**
 * Orchestrator del pipeline de chat: une `parseChatIntent` →
 * `retrieveProducts` → (`generateChatAnswer` o fallback).
 *
 * Vive en `src/lib/chat/` y NO en `src/app/api/chat/route.ts` para que sea
 * testeable sin levantar Next.js — la route es solo transport (parse body,
 * map ApiError, set headers). Mismo patrón que `analyze`.
 *
 * Reglas (spec E05):
 *   - Pregunta vacía o solo whitespace → `invalid_question` 400 (caso borde §13).
 *   - Pregunta > 500 chars → la cortamos y logueamos `chat.truncated` (§13).
 *   - `kind=unknown` o `retrieve` vacío → respondemos con el fallback canónico
 *     SIN llamar al LLM de generación (US-30, §7 y §8).
 *   - `tokensUsed` reporta SUMA de parser + answer (decisión Federico:
 *     queremos ver el gasto real desde el día 1, incluso cuando el answer no
 *     se ejecuta).
 */
import type { Product as PrismaProduct } from '@prisma/client';
import { ApiError } from '@schemas/errors';
import type { IaProvider } from '@/lib/ai/types';
import { logger } from '@/lib/logger';
import {
  noContextFallback,
  unknownIntentFallback,
  type ChatFallback,
} from '@/lib/chat/empty-response';
import { generateChatAnswer } from '@/lib/chat/generate-answer';
import type { ChatIntent } from '@/lib/chat/intent-schema';
import { parseChatIntent } from '@/lib/chat/parse-intent';
import { retrieveProducts } from '@/lib/chat/retrieve';
import { truncateQuestion } from '@/lib/chat/truncate-question';

export interface HandleChatDeps {
  ia: IaProvider;
  requestId: string;
  /** Inyectable para tests de integración con DB en memoria. */
  retrieve?: typeof retrieveProducts;
}

export interface HandleChatResult {
  answer: string;
  products: PrismaProduct[];
  intent: ChatIntent;
  tokensUsed: { in: number; out: number };
  /** Truthy cuando NO se llamó al LLM de generación. */
  fallback: ChatFallback | null;
  questionWasTruncated: boolean;
}

export async function handleChat(
  rawQuestion: string,
  { ia, requestId, retrieve = retrieveProducts }: HandleChatDeps,
): Promise<HandleChatResult> {
  const validated = validateQuestion(rawQuestion);

  const { text: question, truncated, originalLength } = truncateQuestion(validated);
  if (truncated) {
    logger.info('chat.truncated', { requestId, originalLength });
  }

  logger.info('chat.received', { requestId, questionLen: question.length });

  const parse = await parseChatIntent(question, { ia, requestId });
  const intent = parse.intent;

  // US-30 / §8: intent unknown — no retrieve, no answer.
  if (intent.kind === 'unknown') {
    const fb = unknownIntentFallback();
    logger.info('chat.no_context', { requestId, reason: fb.reason });
    return {
      answer: fb.answer,
      products: [],
      intent,
      tokensUsed: { in: parse.tokensIn, out: parse.tokensOut },
      fallback: fb,
      questionWasTruncated: truncated,
    };
  }

  const products = await retrieve(intent);
  logger.info('chat.retrieved', { requestId, count: products.length });

  // US-30 / §7: retrieve vacío — no answer.
  if (products.length === 0) {
    const fb = noContextFallback();
    logger.info('chat.no_context', { requestId, reason: fb.reason });
    return {
      answer: fb.answer,
      products: [],
      intent,
      tokensUsed: { in: parse.tokensIn, out: parse.tokensOut },
      fallback: fb,
      questionWasTruncated: truncated,
    };
  }

  const ans = await generateChatAnswer(question, products, { ia });

  logger.info('chat.answered', {
    requestId,
    tokensIn: parse.tokensIn + ans.tokensIn,
    tokensOut: parse.tokensOut + ans.tokensOut,
    parseLatencyMs: parse.latencyMs,
    answerLatencyMs: ans.latencyMs,
    products: products.length,
    sanitized: ans.sanitized,
  });

  return {
    answer: ans.text,
    products,
    intent,
    tokensUsed: {
      in: parse.tokensIn + ans.tokensIn,
      out: parse.tokensOut + ans.tokensOut,
    },
    fallback: null,
    questionWasTruncated: truncated,
  };
}

function validateQuestion(raw: unknown): string {
  if (typeof raw !== 'string') {
    throw new ApiError('invalid_question', 'La pregunta es obligatoria y debe ser texto.', 400);
  }
  if (raw.trim().length === 0) {
    throw new ApiError('invalid_question', 'Escribí una pregunta antes de enviarla.', 400);
  }
  return raw;
}
