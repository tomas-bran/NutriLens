/**
 * Step `parse_intent` del pipeline de chat.
 *
 * Wrapper sobre `IaProvider.parseIntent` que valida el JSON contra
 * `ChatIntentSchema`. Si el modelo devuelve algo no parseable o un schema
 * inválido, **no lanzamos**: caemos a `UNKNOWN_INTENT` para que el caller
 * pueda atajar con la respuesta de fallback de US-30 / E05 §8.
 *
 * Loguea el resultado (kind, categoria, tokens, latencia) sin exponer el
 * contenido de la pregunta (privacidad).
 */
import type { IaProvider } from '@/lib/ai/types';
import { logger } from '@/lib/logger';
import { ChatIntentSchema, UNKNOWN_INTENT, type ChatIntent } from '@/lib/chat/intent-schema';

export const PARSE_INTENT_PROMPT_VERSION = 'chat_parse_intent-v2' as const;

export interface ParseIntentResult {
  intent: ChatIntent;
  promptVersion: typeof PARSE_INTENT_PROMPT_VERSION;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  /** True cuando el JSON no parseó o no cumplió el schema. */
  fellBackToUnknown: boolean;
}

export interface ParseIntentDeps {
  ia: IaProvider;
  requestId?: string;
}

export async function parseChatIntent(
  question: string,
  { ia, requestId }: ParseIntentDeps,
): Promise<ParseIntentResult> {
  const { raw, usage, latencyMs } = await ia.parseIntent(question, {
    promptVersion: PARSE_INTENT_PROMPT_VERSION,
  });

  const intent = safeParseRaw(raw);
  const fellBack = intent === null;
  const finalIntent = intent ?? UNKNOWN_INTENT;

  logger.info('chat.intent_parsed', {
    requestId,
    kind: finalIntent.kind,
    categoria: finalIntent.categoria,
    tokensIn: usage.in,
    tokensOut: usage.out,
    latencyMs,
    fellBackToUnknown: fellBack,
    promptVersion: PARSE_INTENT_PROMPT_VERSION,
  });

  return {
    intent: finalIntent,
    promptVersion: PARSE_INTENT_PROMPT_VERSION,
    tokensIn: usage.in,
    tokensOut: usage.out,
    latencyMs,
    fellBackToUnknown: fellBack,
  };
}

function safeParseRaw(raw: string): ChatIntent | null {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = ChatIntentSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}
