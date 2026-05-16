/**
 * Cleans up a string that came from an LLM and may contain:
 *   1. Triple-backtick fences (```json ... ``` or ``` ... ```)
 *   2. Prose around the JSON ("Here's your response: { ... }")
 *
 * Returns the best parseable JSON candidate. If no curly braces are found,
 * returns the trimmed text (which will likely fail to parse and trigger
 * the caller's error handling).
 *
 * See `docs/specs/E02 §7`.
 */
export function stripJsonFences(text: string): string {
  if (!text) return '';
  const trimmed = text.trim();

  // 1. Fenced block, ```json or plain ```
  const fenceMatch = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(trimmed);
  if (fenceMatch?.[1]) {
    return fenceMatch[1].trim();
  }

  // 2. Pick the outermost balanced braces, if any.
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first >= 0 && last > first) {
    return trimmed.slice(first, last + 1);
  }

  return trimmed;
}
