/**
 * Step `generate_suggestions` — pills de seguimiento contextuales (NL-503).
 *
 * Después de cada respuesta del chat, una llamada corta al modelo mini
 * propone 3-4 preguntas de seguimiento ancladas en la conversación (la
 * pregunta + un extracto de la respuesta + los productos del contexto).
 *
 * Fail-open SIEMPRE: si el modelo tarda, devuelve basura o un array vacío,
 * retornamos `null` y la UI cae a las sugerencias estáticas
 * (`CHAT_SUGGESTIONS`). Una pill mala es molesta; un chat caído por culpa
 * de las pills es inaceptable.
 */
import type { IaProvider, SavedProductLite } from '@/lib/ai/types';
import { stripJsonFences } from '@/lib/ai/strip-json-fences';

export const SUGGESTIONS_PROMPT_VERSION = 'chat_suggestions-v1' as const;

/** Presupuesto corto: las pills no justifican estirar la respuesta del chat. */
const SUGGESTIONS_TIMEOUT_MS = 5_000;
const MAX_SUGGESTIONS = 4;
const MAX_SUGGESTION_CHARS = 48;
const ANSWER_EXCERPT_CHARS = 600;

export interface GenerateSuggestionsDeps {
  ia: IaProvider;
}

export async function generateSuggestions(
  question: string,
  answer: string,
  products: SavedProductLite[],
  { ia }: GenerateSuggestionsDeps,
): Promise<string[] | null> {
  try {
    const { raw } = await ia.answerWithContext(question, products, {
      promptVersion: SUGGESTIONS_PROMPT_VERSION,
      timeoutMs: SUGGESTIONS_TIMEOUT_MS,
      extra: { answer_excerpt: answer.slice(0, ANSWER_EXCERPT_CHARS) },
    });

    const parsed: unknown = JSON.parse(stripJsonFences(raw));
    if (!Array.isArray(parsed)) return null;

    const clean = parsed
      .filter((s): s is string => typeof s === 'string')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.length <= MAX_SUGGESTION_CHARS)
      .filter((s) => s.toLowerCase() !== question.trim().toLowerCase())
      .slice(0, MAX_SUGGESTIONS);

    // Con menos de 2 sugerencias útiles preferimos el set estático.
    return clean.length >= 2 ? clean : null;
  } catch {
    return null;
  }
}
