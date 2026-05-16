/**
 * Keyword-based allergen inference from the ingredient list.
 *
 * Backup for the model — Phi sometimes lists ingredients correctly but
 * forgets to mark the allergens (US-11 §"casos borde"). We run this
 * AFTER the model's own allergen extraction and union both sets so the
 * frontend never misses an obvious one.
 *
 * The table mirrors the heuristics in the system prompt
 * (`extract_product-v1.md §4`) but lives here as code so it's testable.
 *
 * Matching rules:
 *   - case-insensitive
 *   - diacritics removed (trigo == trígo == TRIGO)
 *   - keyword is a substring of the normalized ingredient string
 *     ("harina de trigo" matches the "trigo" keyword)
 *
 * Returns the inferred allergen set, normalized to the canonical
 * ALERGENOS enum values. Never throws.
 */
import { ALERGENOS, type Alergeno } from '@schemas/product';

/** Keyword → allergen mapping. Multiple keywords can resolve to the same allergen. */
const ALLERGEN_KEYWORDS: ReadonlyArray<{ keyword: string; allergen: Alergeno }> = [
  // gluten — cereals with TACC
  { keyword: 'trigo', allergen: 'gluten' },
  { keyword: 'cebada', allergen: 'gluten' },
  { keyword: 'centeno', allergen: 'gluten' },
  { keyword: 'avena', allergen: 'gluten' },
  { keyword: 'espelta', allergen: 'gluten' },
  { keyword: 'kamut', allergen: 'gluten' },
  { keyword: 'malta', allergen: 'gluten' },
  // leche — dairy
  { keyword: 'leche', allergen: 'leche' },
  { keyword: 'lactosa', allergen: 'leche' },
  { keyword: 'manteca', allergen: 'leche' },
  { keyword: 'mantequilla', allergen: 'leche' },
  { keyword: 'queso', allergen: 'leche' },
  { keyword: 'crema de leche', allergen: 'leche' },
  { keyword: 'suero de leche', allergen: 'leche' },
  { keyword: 'caseina', allergen: 'leche' },
  { keyword: 'yogur', allergen: 'leche' },
  // huevo
  { keyword: 'huevo', allergen: 'huevo' },
  { keyword: 'clara de huevo', allergen: 'huevo' },
  { keyword: 'yema', allergen: 'huevo' },
  { keyword: 'albumina', allergen: 'huevo' },
  // soja
  { keyword: 'soja', allergen: 'soja' },
  { keyword: 'lecitina de soja', allergen: 'soja' },
  // frutos secos
  { keyword: 'almendra', allergen: 'frutos secos' },
  { keyword: 'almendras', allergen: 'frutos secos' },
  { keyword: 'nuez', allergen: 'frutos secos' },
  { keyword: 'nueces', allergen: 'frutos secos' },
  { keyword: 'avellana', allergen: 'frutos secos' },
  { keyword: 'avellanas', allergen: 'frutos secos' },
  { keyword: 'castaña', allergen: 'frutos secos' },
  { keyword: 'castanas', allergen: 'frutos secos' },
  { keyword: 'pistacho', allergen: 'frutos secos' },
  { keyword: 'anacardo', allergen: 'frutos secos' },
  { keyword: 'pecan', allergen: 'frutos secos' },
  // maní (legume, separate from frutos secos per Argentine convention)
  { keyword: 'mani', allergen: 'maní' },
  { keyword: 'cacahuate', allergen: 'maní' },
  // pescado
  { keyword: 'pescado', allergen: 'pescado' },
  { keyword: 'atun', allergen: 'pescado' },
  { keyword: 'salmon', allergen: 'pescado' },
  { keyword: 'merluza', allergen: 'pescado' },
  // crustáceos
  { keyword: 'crustaceo', allergen: 'crustáceos' },
  { keyword: 'camaron', allergen: 'crustáceos' },
  { keyword: 'langostino', allergen: 'crustáceos' },
  // sulfitos
  { keyword: 'sulfito', allergen: 'sulfitos' },
  { keyword: 'dioxido de azufre', allergen: 'sulfitos' },
  // sésamo
  { keyword: 'sesamo', allergen: 'sésamo' },
  { keyword: 'tahini', allergen: 'sésamo' },
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

export function inferAllergensFromIngredients(ingredients: readonly string[]): Alergeno[] {
  const found = new Set<Alergeno>();
  for (const raw of ingredients) {
    if (typeof raw !== 'string') continue;
    const normalized = normalize(raw);
    for (const { keyword, allergen } of ALLERGEN_KEYWORDS) {
      if (normalized.includes(keyword)) {
        found.add(allergen);
      }
    }
  }
  return ALERGENOS.filter((a) => found.has(a));
}

/** Union a model-reported set with the inferred set, preserving canonical order. */
export function mergeAllergens(
  reported: readonly Alergeno[],
  inferred: readonly Alergeno[],
): Alergeno[] {
  const all = new Set<Alergeno>([...reported, ...inferred]);
  return ALERGENOS.filter((a) => all.has(a));
}
