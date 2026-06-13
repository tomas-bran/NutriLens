/**
 * `planChatResponse` — fase pre-respuesta del chat, compartida por el camino
 * no-streaming (`handleChat`) y el streaming (`handleChatStream`).
 *
 * Hace validate → truncate → parse_intent → normalize → retrieve y decide el
 * SIGUIENTE paso, devolviendo un `ChatPlan` discriminado:
 *   - `smalltalk`  → hay que generar (o streamear) una respuesta conversacional.
 *   - `fallback`   → respuesta canned, sin LLM (no-context / missing-compare).
 *   - `answer`     → hay que generar (o streamear) la respuesta con contexto.
 *
 * Centralizar esto evita que las reglas del spec E05 (§7/§8/§13) vivan
 * duplicadas en dos orquestadores con control de flujo distinto.
 */
import type { Product as PrismaProduct } from '@prisma/client';
import { ApiError } from '@schemas/errors';
import type { IaProvider } from '@/lib/ai/types';
import { logger } from '@/lib/logger';
import { findMissingComparables } from '@/lib/chat/compare-helpers';
import {
  missingCompareFallback,
  noContextFallback,
  type ChatFallback,
} from '@/lib/chat/empty-response';
import type { ChatIntent } from '@/lib/chat/intent-schema';
import { parseChatIntent } from '@/lib/chat/parse-intent';
import { retrieveProducts } from '@/lib/chat/retrieve';
import { truncateQuestion } from '@/lib/chat/truncate-question';

interface PlanBase {
  question: string;
  intent: ChatIntent;
  truncated: boolean;
  /** Tokens del parser (+ los del answer se suman después en cada orquestador). */
  parseTokens: { in: number; out: number };
}

export type ChatPlan =
  | (PlanBase & { kind: 'smalltalk' })
  | (PlanBase & {
      kind: 'fallback';
      answer: string;
      products: PrismaProduct[];
      fallback: ChatFallback;
    })
  | (PlanBase & { kind: 'answer'; products: PrismaProduct[] });

export interface PlanChatDeps {
  ia: IaProvider;
  requestId: string;
  retrieve?: typeof retrieveProducts;
}

export async function planChatResponse(
  rawQuestion: string,
  { ia, requestId, retrieve = retrieveProducts }: PlanChatDeps,
): Promise<ChatPlan> {
  const validated = validateQuestion(rawQuestion);
  const { text: question, truncated, originalLength } = truncateQuestion(validated);
  if (truncated) logger.info('chat.truncated', { requestId, originalLength });

  logger.info('chat.received', { requestId, questionLen: question.length });

  const parse = await parseChatIntent(question, { ia, requestId });
  const intent = normalizeCompareIntent(parse.intent);
  if (intent !== parse.intent) {
    logger.info('chat.compare_normalized_to_info', {
      requestId,
      originalKind: parse.intent.kind,
      requested: parse.intent.comparar.length,
    });
  }
  const parseTokens = { in: parse.tokensIn, out: parse.tokensOut };
  const base: PlanBase = { question, intent, truncated, parseTokens };

  if (intent.kind === 'unknown') {
    return { ...base, kind: 'smalltalk' };
  }

  const products = await retrieve(intent);
  logger.info('chat.retrieved', { requestId, count: products.length });

  if (products.length === 0) {
    const fb = noContextFallback();
    logger.info('chat.no_context', { requestId, reason: fb.reason });
    return { ...base, kind: 'fallback', answer: fb.answer, products: [], fallback: fb };
  }

  if (intent.kind === 'compare') {
    const missing = findMissingComparables(intent.comparar, products);
    if (missing.length > 0) {
      const fb = missingCompareFallback(missing);
      logger.info('chat.missing_compare', { requestId, missingCount: missing.length });
      return { ...base, kind: 'fallback', answer: fb.answer, products, fallback: fb };
    }
  }

  return { ...base, kind: 'answer', products };
}

export function validateQuestion(raw: unknown): string {
  if (typeof raw !== 'string') {
    throw new ApiError('invalid_question', 'La pregunta es obligatoria y debe ser texto.', 400);
  }
  if (raw.trim().length === 0) {
    throw new ApiError('invalid_question', 'Escribí una pregunta antes de enviarla.', 400);
  }
  return raw;
}

/**
 * E05 §13: kind=compare con < 2 productos → tratamos como info con esos
 * nombres como keywords (probablemente el usuario preguntó por uno solo).
 */
export function normalizeCompareIntent(intent: ChatIntent): ChatIntent {
  if (intent.kind !== 'compare') return intent;
  if (intent.comparar.length >= 2) return intent;
  return {
    ...intent,
    kind: 'info',
    keywords: [...intent.keywords, ...intent.comparar],
    comparar: [],
  };
}
