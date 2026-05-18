/**
 * Sanitize de la respuesta del chat. Reusa `sanitizeExplanation` con el
 * disclaimer del chat (E05 §6.1) como tail por default.
 */
import {
  CHAT_DISCLAIMER_TAIL,
  sanitizeExplanation,
  type SanitizeResult,
} from '@/lib/ai/sanitize-explanation';

export function sanitizeChatAnswer(raw: string): SanitizeResult {
  return sanitizeExplanation(raw, { disclaimerTail: CHAT_DISCLAIMER_TAIL });
}
