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
 *   - `kind=compare` con sólo 1 producto especificado → normalizamos a `info`
 *     con esos nombres como keywords (US-31 / §13).
 *   - `kind=compare` con ≥2 productos pero uno o más faltan en la DB →
 *     respondemos con `missingCompareFallback` SIN llamar al LLM (US-31 §2 /
 *     §13). Esto cubre el AC §2: "indica qué producto falta y sugiere
 *     analizarlo".
 *   - `tokensUsed` reporta SUMA de parser + answer (decisión Federico:
 *     queremos ver el gasto real desde el día 1, incluso cuando el answer no
 *     se ejecuta).
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
import { generateChatAnswer, toSavedProductLite } from '@/lib/chat/generate-answer';
import { generateSmallTalkAnswer } from '@/lib/chat/generate-smalltalk';
import { generateSuggestions } from '@/lib/chat/generate-suggestions';
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
  /**
   * Pills de seguimiento contextuales (NL-503). `null` cuando la generación
   * falló o el camino fue un fallback canned — la UI cae al set estático.
   */
  suggestions: string[] | null;
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
  // Caso borde E05 §13: kind=compare con < 2 productos → normalizamos a info
  // con esos nombres como keywords. El usuario probablemente quiso preguntar
  // por uno solo.
  const intent = normalizeCompareIntent(parse.intent);
  if (intent !== parse.intent) {
    logger.info('chat.compare_normalized_to_info', {
      requestId,
      originalKind: parse.intent.kind,
      requested: parse.intent.comparar.length,
    });
  }

  // US-30 / §8 (refinado): intent unknown — no hacemos retrieve, pero en vez
  // del fallback canned dejamos que el LLM mantenga conversación dentro del
  // dominio (saludos, chit-chat, redirección a funciones de la app).
  // El prompt `chat_smalltalk-v1` restringe al modelo a no inventar productos.
  if (intent.kind === 'unknown') {
    const smalltalk = await generateSmallTalkAnswer(question, { ia });
    logger.info('chat.smalltalk', {
      requestId,
      tokensIn: parse.tokensIn + smalltalk.tokensIn,
      tokensOut: parse.tokensOut + smalltalk.tokensOut,
      parseLatencyMs: parse.latencyMs,
      answerLatencyMs: smalltalk.latencyMs,
    });
    const smalltalkSuggestions = await generateSuggestions(question, smalltalk.text, [], { ia });
    return {
      answer: smalltalk.text,
      products: [],
      intent,
      tokensUsed: {
        in: parse.tokensIn + smalltalk.tokensIn,
        out: parse.tokensOut + smalltalk.tokensOut,
      },
      fallback: null,
      questionWasTruncated: truncated,
      suggestions: smalltalkSuggestions,
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
      suggestions: null,
    };
  }

  // US-31 §2 / E05 §13: compare con ≥1 producto faltante → fallback canónico
  // sin llamar al LLM. La respuesta nombra qué falta y sugiere analizarlo.
  if (intent.kind === 'compare') {
    const missing = findMissingComparables(intent.comparar, products);
    if (missing.length > 0) {
      const fb = missingCompareFallback(missing);
      logger.info('chat.missing_compare', { requestId, missingCount: missing.length });
      return {
        answer: fb.answer,
        // Devolvemos los productos que SÍ están como chips (para que el usuario
        // pueda navegar al detalle de los que ya tiene).
        products,
        intent,
        tokensUsed: { in: parse.tokensIn, out: parse.tokensOut },
        fallback: fb,
        questionWasTruncated: truncated,
        suggestions: null,
      };
    }
  }

  const ans = await generateChatAnswer(question, products, intent, { ia });

  logger.info('chat.answered', {
    requestId,
    tokensIn: parse.tokensIn + ans.tokensIn,
    tokensOut: parse.tokensOut + ans.tokensOut,
    parseLatencyMs: parse.latencyMs,
    answerLatencyMs: ans.latencyMs,
    products: products.length,
    sanitized: ans.sanitized,
  });

  const suggestions = await generateSuggestions(
    question,
    ans.text,
    products.map(toSavedProductLite),
    { ia },
  );

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
    suggestions,
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

/**
 * E05 §13: "Intent con kind=compare pero solo 1 producto especificado:
 * tratamos como info con esa keyword". Si el parser etiquetó como compare
 * pero sólo capturó un nombre (o ninguno), bajamos a `info` con esos nombres
 * como keywords — el retrieve los buscará por nombre/ingredientes/alergenos
 * como cualquier otra info, y la respuesta sigue el flow normal.
 */
function normalizeCompareIntent(intent: ChatIntent): ChatIntent {
  if (intent.kind !== 'compare') return intent;
  if (intent.comparar.length >= 2) return intent;
  return {
    ...intent,
    kind: 'info',
    keywords: [...intent.keywords, ...intent.comparar],
    comparar: [],
  };
}
