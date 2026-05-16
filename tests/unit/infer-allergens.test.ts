import { describe, expect, it } from 'vitest';
import { ALERGENOS } from '@schemas/product';
import { inferAllergensFromIngredients, mergeAllergens } from '@/lib/extract/infer-allergens';

describe('inferAllergensFromIngredients — mapping table (US-11)', () => {
  // Casos del Gherkin de US-11 + tabla pedida por el usuario:
  //   "harina de trigo" → gluten
  //   "leche en polvo" + "almendras" → leche + frutos secos
  //   + variantes comunes que aparecen en etiquetas reales argentinas
  it.each<[string[], string[]]>([
    [['harina de trigo'], ['gluten']],
    [
      ['leche en polvo', 'almendras'],
      ['leche', 'frutos secos'],
    ],
    [['leche entera', 'fermentos lácticos'], ['leche']],
    [['huevo', 'azúcar', 'aceite vegetal'], ['huevo']],
    [['lecitina de soja'], ['soja']],
    [['maní tostado', 'sal'], ['maní']],
    [['nueces pecan', 'azúcar'], ['frutos secos']],
    [['tahini', 'limón'], ['sésamo']],
    [['atún en aceite', 'sal'], ['pescado']],
    // Output is sorted by ALERGENOS enum order: soja (idx 3) before crustáceos (idx 7)
    [
      ['langostinos', 'salsa de soja'],
      ['soja', 'crustáceos'],
    ],
    [['vino tinto', 'sulfitos añadidos'], ['sulfitos']],
    [
      ['manteca', 'azúcar', 'harina de trigo'],
      ['gluten', 'leche'],
    ],
    [
      ['queso parmesano rallado', 'avena'],
      ['gluten', 'leche'],
    ],
  ])('infers %j → %j', (ingredients, expected) => {
    expect(inferAllergensFromIngredients(ingredients)).toEqual(expected);
  });

  it('returns [] when no ingredient matches', () => {
    expect(inferAllergensFromIngredients(['agua', 'sal', 'colorante caramelo'])).toEqual([]);
  });

  it('returns [] for an empty list', () => {
    expect(inferAllergensFromIngredients([])).toEqual([]);
  });

  it('is case-insensitive and ignores diacritics', () => {
    expect(inferAllergensFromIngredients(['HARINA DE TRIGO', 'Leche EN Polvo'])).toEqual([
      'gluten',
      'leche',
    ]);
    expect(inferAllergensFromIngredients(['trígo'])).toEqual(['gluten']);
  });

  it('skips non-string entries without crashing (defensive)', () => {
    // Force-cast — production callers pass strings, but the LLM occasionally
    // hands back garbage and the inference should never throw.
    const ingredients = ['harina de trigo', 42, null, 'leche'] as unknown as readonly string[];
    expect(inferAllergensFromIngredients(ingredients)).toEqual(['gluten', 'leche']);
  });

  it('deduplicates and preserves the canonical ALERGENOS order', () => {
    const out = inferAllergensFromIngredients([
      'manteca',
      'leche',
      'queso',
      'avellanas',
      'almendras',
    ]);
    expect(out).toEqual(['leche', 'frutos secos']);
    // Sanity: order matches ALERGENOS array
    const positions = out.map((a) => ALERGENOS.indexOf(a));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});

describe('mergeAllergens', () => {
  it('unions model-reported and inferred sets in canonical order', () => {
    expect(mergeAllergens(['leche'], ['gluten', 'leche'])).toEqual(['gluten', 'leche']);
  });

  it('deduplicates when both sides report the same allergen', () => {
    expect(mergeAllergens(['gluten', 'leche'], ['leche'])).toEqual(['gluten', 'leche']);
  });

  it('returns [] for two empty inputs', () => {
    expect(mergeAllergens([], [])).toEqual([]);
  });
});
