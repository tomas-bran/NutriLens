/**
 * Orchestrator no-streaming del chat. Usa `planChatResponse` para la fase
 * pre-respuesta (parse → retrieve → decisión) y completa la respuesta de una
 * sola vez. La variante streaming vive en `handle-chat-stream.ts` y comparte
 * el mismo planner.
 *
 * Vive en `src/lib/chat/` (no en la route) para ser testeable sin Next.
 *
 * Reglas y decisiones del spec E05 (§7/§8/§13) están en `planChatResponse`.
 * `tokensUsed` reporta SUMA de parser + answer.
 */
import type { Product as PrismaProduct } from '@prisma/client';
import type { IaProvider } from '@/lib/ai/types';
import { logger } from '@/lib/logger';
import type { ChatFallback } from '@/lib/chat/empty-response';
import { generateChatAnswer, toSavedProductLite } from '@/lib/chat/generate-answer';
import { generateSmallTalkAnswer } from '@/lib/chat/generate-smalltalk';
import { generateSuggestions } from '@/lib/chat/generate-suggestions';
import type { ChatIntent } from '@/lib/chat/intent-schema';
import { planChatResponse } from '@/lib/chat/plan-chat-response';
import type { retrieveProducts } from '@/lib/chat/retrieve';

export interface HandleChatDeps {
  ia: IaProvider;
  requestId: string;
  /** Inyectable para tests de integración con DB en memoria. */
  retrieve?: typeof retrieveProducts;
  /**
   * NL-208: resumen de las preferencias de dieta del usuario, resuelto por la
   * route (transport). Vacío => sin preferencias. Mantener la resolución de
   * identidad fuera del orquestador lo deja testeable sin auth/next-server.
   */
  userPrefs?: string;
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
  { ia, requestId, retrieve, userPrefs = '' }: HandleChatDeps,
): Promise<HandleChatResult> {
  const plan = await planChatResponse(rawQuestion, { ia, requestId, retrieve });
  const { question, intent, truncated, parseTokens } = plan;

  if (plan.kind === 'smalltalk') {
    const smalltalk = await generateSmallTalkAnswer(question, { ia });
    logger.info('chat.smalltalk', {
      requestId,
      tokensIn: parseTokens.in + smalltalk.tokensIn,
      tokensOut: parseTokens.out + smalltalk.tokensOut,
      answerLatencyMs: smalltalk.latencyMs,
    });
    const suggestions = await generateSuggestions(question, smalltalk.text, [], { ia });
    return {
      answer: smalltalk.text,
      products: [],
      intent,
      tokensUsed: {
        in: parseTokens.in + smalltalk.tokensIn,
        out: parseTokens.out + smalltalk.tokensOut,
      },
      fallback: null,
      questionWasTruncated: truncated,
      suggestions,
    };
  }

  if (plan.kind === 'fallback') {
    return {
      answer: plan.answer,
      products: plan.products,
      intent,
      tokensUsed: parseTokens,
      fallback: plan.fallback,
      questionWasTruncated: truncated,
      suggestions: null,
    };
  }

  // El compare con ≥1 producto faltante ya se resuelve como fallback dentro de
  // `planChatResponse` (kind === 'fallback', manejado arriba). Acá solo queda el
  // camino con productos: generamos la respuesta. NL-208: pasamos las
  // preferencias del usuario como contexto para priorizar lo que le importa.
  const { products } = plan;
  const ans = await generateChatAnswer(question, products, intent, { ia, userPrefs });
  logger.info('chat.answered', {
    requestId,
    tokensIn: parseTokens.in + ans.tokensIn,
    tokensOut: parseTokens.out + ans.tokensOut,
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
    tokensUsed: { in: parseTokens.in + ans.tokensIn, out: parseTokens.out + ans.tokensOut },
    fallback: null,
    questionWasTruncated: truncated,
    suggestions,
  };
}
