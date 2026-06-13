/**
 * Cliente de `/api/chat/suggestions` — pide sugerencias de arranque generadas
 * por IA (prefs del usuario + catálogo). Devuelve `[]` ante cualquier error;
 * el caller decide si conserva las que tenía (fail-open).
 */
export async function fetchSuggestions(): Promise<string[]> {
  try {
    const res = await fetch('/api/chat/suggestions', { method: 'POST' });
    if (!res.ok) return [];
    const data = (await res.json()) as { suggestions?: unknown };
    return Array.isArray(data.suggestions)
      ? data.suggestions.filter((s): s is string => typeof s === 'string')
      : [];
  } catch {
    return [];
  }
}
