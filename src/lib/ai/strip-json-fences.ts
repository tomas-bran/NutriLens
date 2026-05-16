/**
 * Limpia un string que vino del LLM y puede tener:
 *   1. Fences ```json ... ```
 *   2. Texto pre/post el JSON ("Aquí está tu respuesta: { ... }")
 *
 * Devuelve la mejor aproximación a JSON parseable. Si no encuentra
 * llaves, devuelve el texto trimmed (que probablemente falle al
 * parsear y caerá en el manejo de error del caller).
 *
 * Ver `docs/specs/E02 §7`.
 */
export function stripJsonFences(text: string): string {
  if (!text) return '';
  const trimmed = text.trim();

  // 1. Fence con ```json o ```
  const fenceMatch = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(trimmed);
  if (fenceMatch?.[1]) {
    return fenceMatch[1].trim();
  }

  // 2. Primera llave balanceada
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first >= 0 && last > first) {
    return trimmed.slice(first, last + 1);
  }

  return trimmed;
}
