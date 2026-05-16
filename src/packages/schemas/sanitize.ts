/**
 * Pre-validation sanitizer for the model output.
 *
 * Per spec E02 §6: "Si el modelo devuelve un alérgeno o sello fuera de la
 * lista, lo descartamos en lugar de fallar." Same idea for categoria and
 * riesgo: we coerce out-of-enum values to safe defaults instead of throwing,
 * because Phi sometimes drifts (e.g. "lácteo" vs "lácteos", "exceso de
 * azúcar" vs "exceso en azúcares").
 *
 * Runs BEFORE ProductExtractionSchema.safeParse. Returns the raw payload
 * with enum-typed fields filtered down to their allowlist.
 */
import { ALERGENOS, CATEGORIAS, RIESGOS, SELLOS, type Categoria, type Riesgo } from './product';

const ALERGENOS_SET = new Set<string>(ALERGENOS);
const SELLOS_SET = new Set<string>(SELLOS);
const CATEGORIAS_SET = new Set<string>(CATEGORIAS);
const RIESGOS_SET = new Set<string>(RIESGOS);

const DEFAULT_CATEGORIA: Categoria = 'otros';
const DEFAULT_RIESGO: Riesgo = 'bajo';

/**
 * Drop out-of-enum allergens/sellos, coerce unknown categoria → "otros" and
 * unknown riesgo → "bajo". Untouched fields pass through verbatim — Zod
 * will catch their type errors downstream.
 */
export function sanitizeProductExtraction(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const obj = { ...(raw as Record<string, unknown>) };

  if (Array.isArray(obj.alergenos)) {
    obj.alergenos = filterByAllowlist(obj.alergenos, ALERGENOS_SET);
  }
  if (Array.isArray(obj.sellos)) {
    obj.sellos = filterByAllowlist(obj.sellos, SELLOS_SET);
  }
  if (Array.isArray(obj.ingredientes_detectados)) {
    obj.ingredientes_detectados = obj.ingredientes_detectados
      .filter((s): s is string => typeof s === 'string')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  if (typeof obj.categoria === 'string' && !CATEGORIAS_SET.has(obj.categoria)) {
    obj.categoria = DEFAULT_CATEGORIA;
  }
  if (typeof obj.riesgo === 'string' && !RIESGOS_SET.has(obj.riesgo)) {
    obj.riesgo = DEFAULT_RIESGO;
  }

  return obj;
}

function filterByAllowlist(arr: unknown[], allowlist: Set<string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of arr) {
    if (typeof item !== 'string') continue;
    const normalized = item.trim().toLowerCase();
    if (!allowlist.has(normalized) || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}
