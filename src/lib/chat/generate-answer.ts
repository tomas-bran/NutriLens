/**
 * Step `generate_answer` del pipeline de chat (US-29 / E05 §6).
 *
 * Llama a `IaProvider.answerWithContext` con los productos recuperados como
 * contexto (truncados a SavedProductLite para no inflar el prompt), saneamos
 * la salida (`sanitizeChatAnswer`) y devolvemos texto + tokens + latencia.
 *
 * No persistimos la conversación (MVP, ver Non-goals del spec).
 */
import type { Product as PrismaProduct } from '@prisma/client';
import type { IaProvider, SavedProductLite } from '@/lib/ai/types';
import { mapCategoriaFromPrisma } from '@/lib/products/serializers';
import { sanitizeChatAnswer } from '@/lib/chat/sanitize-chat-answer';

export const ANSWER_PROMPT_VERSION = 'chat_answer-v1' as const;

export interface GenerateAnswerResult {
  text: string;
  promptVersion: typeof ANSWER_PROMPT_VERSION;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  sanitized: {
    matchedPatterns: string[];
    disclaimerAppended: boolean;
  };
}

export interface GenerateAnswerDeps {
  ia: IaProvider;
}

export async function generateChatAnswer(
  question: string,
  products: PrismaProduct[],
  { ia }: GenerateAnswerDeps,
): Promise<GenerateAnswerResult> {
  const lite = products.map(toLite);
  const { raw, usage, latencyMs } = await ia.answerWithContext(question, lite, {
    promptVersion: ANSWER_PROMPT_VERSION,
  });
  const sanitized = sanitizeChatAnswer(raw);
  return {
    text: sanitized.text,
    promptVersion: ANSWER_PROMPT_VERSION,
    tokensIn: usage.in,
    tokensOut: usage.out,
    latencyMs,
    sanitized: {
      matchedPatterns: sanitized.matchedPatterns,
      disclaimerAppended: sanitized.disclaimerAppended,
    },
  };
}

function toLite(p: PrismaProduct): SavedProductLite {
  return {
    id: p.id,
    nombre: p.nombre,
    categoria: mapCategoriaFromPrisma(p.categoria),
    riesgo: p.riesgo,
    alergenos: safeArray(p.alergenos),
    sellos: safeArray(p.sellos),
  };
}

function safeArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : [];
  } catch {
    return [];
  }
}
