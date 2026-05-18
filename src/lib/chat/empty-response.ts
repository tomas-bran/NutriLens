/**
 * Respuestas canónicas para los dos casos donde NO invocamos al LLM de
 * generación: retrieval vacío (US-30) e intent unknown (E05 §8).
 *
 * Mantener estos textos en un único lugar — son visibles para el usuario y
 * verificados por tests de integración + E2E.
 */
export const EMPTY_CONTEXT_ANSWER =
  'No tengo productos guardados que respondan a esa pregunta. Subí más etiquetas para enriquecer tu historial.';

export const UNKNOWN_INTENT_ANSWER =
  'No te entendí bien. Probá con preguntas como "mostrame productos sin gluten" o "qué galletitas tengo guardadas".';

export type ChatFallbackReason = 'no_context' | 'unknown_intent';

export interface ChatFallback {
  answer: string;
  reason: ChatFallbackReason;
  /** US-30 §2: cuando no hay contexto sugerimos analizar un producto nuevo. */
  showAnalyzeCta: boolean;
}

export function noContextFallback(): ChatFallback {
  return {
    answer: EMPTY_CONTEXT_ANSWER,
    reason: 'no_context',
    showAnalyzeCta: true,
  };
}

export function unknownIntentFallback(): ChatFallback {
  return {
    answer: UNKNOWN_INTENT_ANSWER,
    reason: 'unknown_intent',
    showAnalyzeCta: false,
  };
}
