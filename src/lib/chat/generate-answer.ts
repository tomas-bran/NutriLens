/**
 * Step `generate_answer` del pipeline de chat (US-29 + US-31 / E05 §6).
 *
 * Llama a `IaProvider.answerWithContext` con los productos recuperados como
 * contexto (truncados a SavedProductLite para no inflar el prompt), saneamos
 * la salida (`sanitizeChatAnswer`) y devolvemos texto + tokens + latencia.
 *
 * Versionado del prompt:
 *   - `kind = compare` (US-31) → `chat_answer-v2` (tabla markdown).
 *   - cualquier otro kind → `chat_answer-v3` (markdown liviano + permite
 *     responder preguntas nutricionales generales cuando los productos del
 *     contexto no aplican; sucede a `chat_answer-v1`, el "texto plano" previo
 *     a que NL-303 renderizara markdown en el chat).
 *
 * No persistimos la conversación (MVP, ver Non-goals del spec).
 */
import type { Product as PrismaProduct } from '@prisma/client';
import type { IaProvider, SavedProductLite } from '@/lib/ai/types';
import { mapCategoriaFromPrisma } from '@/lib/products/serializers';
import type { ChatIntent } from '@/lib/chat/intent-schema';
import { sanitizeChatAnswer } from '@/lib/chat/sanitize-chat-answer';

export const ANSWER_PROMPT_VERSION_DEFAULT = 'chat_answer-v3' as const;
export const ANSWER_PROMPT_VERSION_COMPARE = 'chat_answer-v2' as const;

export type AnswerPromptVersion =
  | typeof ANSWER_PROMPT_VERSION_DEFAULT
  | typeof ANSWER_PROMPT_VERSION_COMPARE;

export interface GenerateAnswerResult {
  text: string;
  promptVersion: AnswerPromptVersion;
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

export function pickAnswerPromptVersion(intent: ChatIntent): AnswerPromptVersion {
  return intent.kind === 'compare' ? ANSWER_PROMPT_VERSION_COMPARE : ANSWER_PROMPT_VERSION_DEFAULT;
}

export async function generateChatAnswer(
  question: string,
  products: PrismaProduct[],
  intent: ChatIntent,
  { ia }: GenerateAnswerDeps,
): Promise<GenerateAnswerResult> {
  const lite = products.map(toLite);
  const promptVersion = pickAnswerPromptVersion(intent);
  const { raw, usage, latencyMs } = await ia.answerWithContext(question, lite, {
    promptVersion,
    // El prompt v2 lee `intent_kind` para activar el formato tabla en compare.
    extra: { intent_kind: intent.kind },
  });
  const sanitized = sanitizeChatAnswer(raw);
  return {
    text: sanitized.text,
    promptVersion,
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
