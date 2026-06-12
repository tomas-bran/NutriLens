/**
 * Step `generate_smalltalk` — respuesta conversacional cuando el intent
 * parser devuelve `unknown` (saludos, chit-chat, preguntas off-topic).
 *
 * En vez del fallback canned histórico ("No te entendí bien…"), llamamos
 * al LLM con el prompt `chat_smalltalk-v1` que lo mantiene en el dominio
 * de NutriLens y guía al usuario hacia las funciones de la app.
 *
 * Reusa `IaProvider.answerWithContext` con `products=[]` — el prompt no
 * lee `products_json`, así que pasar el array vacío no afecta. Esto evita
 * agregar un método nuevo al IaProvider interface.
 */
import type { IaProvider } from '@/lib/ai/types';
import { sanitizeChatAnswer } from '@/lib/chat/sanitize-chat-answer';

export const SMALLTALK_PROMPT_VERSION = 'chat_smalltalk-v1' as const;

export interface GenerateSmallTalkResult {
  text: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
}

export interface GenerateSmallTalkDeps {
  ia: IaProvider;
}

export async function generateSmallTalkAnswer(
  question: string,
  { ia }: GenerateSmallTalkDeps,
): Promise<GenerateSmallTalkResult> {
  const { raw, usage, latencyMs } = await ia.answerWithContext(question, [], {
    promptVersion: SMALLTALK_PROMPT_VERSION,
  });
  const sanitized = sanitizeChatAnswer(raw);
  return {
    text: sanitized.text,
    tokensIn: usage.in,
    tokensOut: usage.out,
    latencyMs,
  };
}
