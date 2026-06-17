/**
 * Step `generate_answer` del pipeline de chat (US-29 + US-31 / E05 §6).
 *
 * Llama a `IaProvider.answerWithContext` con los productos recuperados como
 * contexto (truncados a SavedProductLite para no inflar el prompt), saneamos
 * la salida (`sanitizeChatAnswer`) y devolvemos texto + tokens + latencia.
 *
 * Versionado del prompt: TODOS los intents usan `chat_answer-v3` (NL-702
 * unificó el compare ahí: el prompt lee `intent_kind` y activa tabla +
 * veredicto cuando es "compare"). `chat_answer-v1`/`-v2` quedan en el
 * registry solo para que los traces históricos sigan legibles.
 *
 * No persistimos la conversación (MVP, ver Non-goals del spec).
 */
import type { Product as PrismaProduct } from '@prisma/client';
import type { IaProvider, SavedProductLite } from '@/lib/ai/types';
import { mapCategoriaFromPrisma } from '@/lib/products/serializers';
import type { ChatIntent } from '@/lib/chat/intent-schema';
import { sanitizeChatAnswer } from '@/lib/chat/sanitize-chat-answer';

export const ANSWER_PROMPT_VERSION_DEFAULT = 'chat_answer-v3' as const;

export type AnswerPromptVersion = typeof ANSWER_PROMPT_VERSION_DEFAULT;

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
  /**
   * NL-208: resumen en lenguaje natural de las preferencias de dieta del
   * usuario (celíaco/vegano/sin lactosa). Se inyecta al prompt para que la
   * respuesta priorice avisar sobre lo que le importa. Vacío = sin prefs.
   */
  userPrefs?: string;
}

export function pickAnswerPromptVersion(_intent: ChatIntent): AnswerPromptVersion {
  // v3 maneja todos los kinds; el formato compare lo activa `intent_kind`
  // dentro del propio prompt.
  return ANSWER_PROMPT_VERSION_DEFAULT;
}

export async function generateChatAnswer(
  question: string,
  products: PrismaProduct[],
  intent: ChatIntent,
  { ia, userPrefs = '' }: GenerateAnswerDeps,
): Promise<GenerateAnswerResult> {
  const lite = products.map(toLite);
  const promptVersion = pickAnswerPromptVersion(intent);
  const { raw, usage, latencyMs } = await ia.answerWithContext(question, lite, {
    promptVersion,
    // El prompt v2 lee `intent_kind` para activar el formato tabla en compare.
    // `user_prefs` (NL-208) lo usan ambos prompts para personalizar avisos.
    extra: { intent_kind: intent.kind, user_prefs: userPrefs },
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
    // Cap para no inflar el prompt: 12 ingredientes alcanzan para responder
    // "¿qué tiene X?" sin pegar listas industriales completas.
    ingredientes: safeArray(p.ingredientes).slice(0, 12),
  };
}

/** Exportado para reuso: generate-suggestions necesita el mismo shape lite. */
export function toSavedProductLite(p: PrismaProduct): SavedProductLite {
  return toLite(p);
}

function safeArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : [];
  } catch {
    return [];
  }
}
