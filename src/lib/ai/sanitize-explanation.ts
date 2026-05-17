/**
 * Post-process the LLM explanation before returning it to the user.
 *
 * Two responsibilities, per spec E03 §5.5:
 *   1. Strip "clinical" phrases the model might emit despite the prompt
 *      asking it not to ("consultá a un médico", "no consumir", etc).
 *      We replace them with "[texto removido]" so the censoring is visible
 *      and reviewable, not silent.
 *   2. Ensure the disclaimer "NutriLens es un asistente informativo" is
 *      present somewhere in the output. If the model omits it, we append
 *      a canonical closing.
 *
 * Idempotent: sanitize(sanitize(x)) === sanitize(x).
 */
export const REMOVED_MARKER = '[texto removido]';
export const DISCLAIMER_NEEDLE = 'NutriLens es un asistente informativo';
export const DISCLAIMER_TAIL = 'Recordá que NutriLens es un asistente informativo.';

/** Phrases the model is asked NOT to emit; if it does, we replace them. */
export const BLOCKED_PHRASES: ReadonlyArray<RegExp> = [
  /\bconsult[áa]\s+(?:a\s+un\s+)?m[ée]dic[oa]\b/i,
  /\bpeligros[oa]\s+para\s+tu\s+salud\b/i,
  /\bno\s+consumir\b/i,
  /\bes\s+t[óo]xico\b/i,
];

export interface SanitizeResult {
  text: string;
  /** Snake_case labels of the patterns we matched, for logging (no content). */
  matchedPatterns: string[];
  /** True when we had to append the disclaimer tail. */
  disclaimerAppended: boolean;
}

const PATTERN_LABELS = ['consulta_medico', 'peligroso_salud', 'no_consumir', 'es_toxico'] as const;

export function sanitizeExplanation(raw: string): SanitizeResult {
  let text = raw.trim();
  const matchedPatterns: string[] = [];

  for (let i = 0; i < BLOCKED_PHRASES.length; i++) {
    const rx = BLOCKED_PHRASES[i]!;
    if (rx.test(text)) {
      matchedPatterns.push(PATTERN_LABELS[i]!);
      text = text.replace(rx, REMOVED_MARKER);
    }
  }

  let disclaimerAppended = false;
  if (!text.includes(DISCLAIMER_NEEDLE)) {
    text = text.length > 0 ? `${text} ${DISCLAIMER_TAIL}` : DISCLAIMER_TAIL;
    disclaimerAppended = true;
  }

  return { text: text.trim(), matchedPatterns, disclaimerAppended };
}
