/**
 * Respuestas canónicas para los casos donde NO invocamos al LLM de
 * generación: retrieval vacío (US-30), intent unknown (E05 §8), y compare con
 * uno o más productos faltantes en el catálogo (US-31 §2 + E05 §13).
 *
 * Mantener estos textos en un único lugar — son visibles para el usuario y
 * verificados por tests de integración + E2E.
 */
import { buildMissingProductMessage } from '@/lib/chat/compare-helpers';

export const EMPTY_CONTEXT_ANSWER =
  'No tengo productos guardados que respondan a esa pregunta. Subí más etiquetas para enriquecer el catálogo.';

export const UNKNOWN_INTENT_ANSWER =
  'No te entendí bien. Probá con preguntas como "mostrame productos sin gluten" o "qué galletitas tengo guardadas".';

export type ChatFallbackReason = 'no_context' | 'unknown_intent' | 'missing_compare';

export interface ChatFallback {
  answer: string;
  reason: ChatFallbackReason;
  /** US-30 §2 / US-31 §2: sugerimos analizar un producto nuevo cuando aplica. */
  showAnalyzeCta: boolean;
  /**
   * Solo presente cuando `reason = 'missing_compare'`. Lista los nombres que
   * el usuario pidió comparar pero no están en el catálogo — la UI los puede
   * destacar en el mensaje si quiere.
   */
  missingProducts?: string[];
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

export function missingCompareFallback(missingProducts: string[]): ChatFallback {
  return {
    answer: buildMissingProductMessage(missingProducts),
    reason: 'missing_compare',
    showAnalyzeCta: true,
    missingProducts,
  };
}
