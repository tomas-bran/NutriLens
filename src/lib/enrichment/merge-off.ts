/**
 * Merge entre la extracción del LLM y la data de Open Food Facts.
 *
 * Reglas:
 *   - El LLM ve la foto real → tiene precedencia en cualquier campo donde
 *     YA tenga data.
 *   - OFF rellena los huecos: ingredientes/alérgenos vacíos en el LLM
 *     se completan con lo que devuelve OFF.
 *   - Nunca tocamos `apto_*`, `riesgo`, `confidence` — esos vienen de
 *     reglas + LLM, no de OFF.
 *
 * OFF devuelve allergens_tags como `["en:gluten", "en:milk", "en:eggs"]`.
 * Normalizamos al vocabulario canónico de NutriLens (ALERGENOS, en español).
 */
import { ALERGENOS, type Alergeno, type ProductExtraction } from '@schemas/product';
import type { OffMatch } from './off-client';

/** Mapping en:tag → vocabulario NutriLens. */
const OFF_ALLERGEN_MAP: Record<string, Alergeno> = {
  'en:gluten': 'gluten',
  'en:milk': 'leche',
  'en:eggs': 'huevo',
  'en:soybeans': 'soja',
  'en:nuts': 'frutos secos',
  'en:tree-nuts': 'frutos secos',
  'en:peanuts': 'maní',
  'en:fish': 'pescado',
  'en:crustaceans': 'crustáceos',
  'en:sulphur-dioxide-and-sulphites': 'sulfitos',
  'en:sesame-seeds': 'sésamo',
};

export interface MergeResult {
  product: ProductExtraction;
  /** Campos que el merge terminó completando desde OFF (para auditoría). */
  filledFromOff: string[];
}

export function mergeOffIntoExtraction(product: ProductExtraction, off: OffMatch): MergeResult {
  const filled: string[] = [];
  const merged: ProductExtraction = { ...product };

  // Ingredientes: si el LLM viene vacío, parseamos el texto de OFF
  // a una lista (split por comas, mayúsculas/minúsculas normalizadas).
  if (merged.ingredientes_detectados.length === 0 && off.ingredientsText) {
    const parsed = parseIngredientsText(off.ingredientsText);
    if (parsed.length > 0) {
      merged.ingredientes_detectados = parsed;
      filled.push('ingredientes_detectados');
    }
  }

  // Alérgenos: idem. OFF devuelve tags `en:*` que normalizamos.
  if (merged.alergenos.length === 0 && off.allergensTags.length > 0) {
    const mapped = normalizeAllergens(off.allergensTags);
    if (mapped.length > 0) {
      merged.alergenos = mapped;
      filled.push('alergenos');
    }
  }

  return { product: merged, filledFromOff: filled };
}

/**
 * "Harina de trigo, azúcar, cacao en polvo (lecitina de soja), sal."
 *   → ["harina de trigo", "azúcar", "cacao en polvo", "sal"]
 *
 * Separa por comas + punto + paréntesis (los sub-ingredientes entre
 * paréntesis se descartan para la primera versión; podemos refinarlo
 * después si vemos que perdemos info útil).
 */
export function parseIngredientsText(text: string): string[] {
  return text
    .replace(/\([^)]*\)/g, '') // quita sub-ingredientes entre paréntesis
    .split(/[,;.]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0 && s.length < 60); // descarta vacíos y outliers largos
}

/** Mapea tags `en:*` de OFF al vocabulario canónico de NutriLens. */
export function normalizeAllergens(tags: ReadonlyArray<string>): Alergeno[] {
  const result = new Set<Alergeno>();
  for (const tag of tags) {
    const lower = tag.toLowerCase();
    const mapped = OFF_ALLERGEN_MAP[lower];
    if (mapped && (ALERGENOS as readonly string[]).includes(mapped)) {
      result.add(mapped);
    }
  }
  return [...result];
}
