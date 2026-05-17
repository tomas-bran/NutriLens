/**
 * Corta la pregunta del usuario a un máximo de caracteres antes de mandársela
 * al parser. Spec: `docs/specs/E05-chat-rag.md §13` ("Pregunta de >500 chars:
 * la cortamos a 500 antes de mandarla al parser. Logueamos `chat.truncated`").
 *
 * Usamos `Array.from(str)` para iterar por code points reales (no por code
 * units UTF-16), así un emoji de 2 surrogates cuenta como 1 carácter visible
 * y no parte un grafema por la mitad en el límite.
 */
export const QUESTION_MAX_CHARS = 500;

export interface TruncateResult {
  text: string;
  truncated: boolean;
  originalLength: number;
}

export function truncateQuestion(raw: string, max: number = QUESTION_MAX_CHARS): TruncateResult {
  const cps = Array.from(raw);
  if (cps.length <= max) {
    return { text: raw, truncated: false, originalLength: cps.length };
  }
  return {
    text: cps.slice(0, max).join(''),
    truncated: true,
    originalLength: cps.length,
  };
}
