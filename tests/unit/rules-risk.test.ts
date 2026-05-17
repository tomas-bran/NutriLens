/**
 * compute_risk — full truth table from spec E03 §4.2, every cell exercised
 * explicitly. Plus the boundary cases not visible in the table summary.
 */
import { describe, expect, it } from 'vitest';
import { compute_risk } from '@/lib/rules/risk';
import type { RulesResult } from '@/lib/rules/apply';
import type { Alergeno, ProductExtraction, Sello } from '@schemas/product';

function makeProduct(sellos: Sello[], alergenos: Alergeno[]): ProductExtraction {
  return {
    producto: 'X',
    categoria: 'otros',
    ingredientes_detectados: [],
    alergenos,
    sellos,
    apto_vegano: true,
    apto_celiaco: true,
    apto_sin_lactosa: true,
    riesgo: 'bajo',
    confidence: 0.9,
  };
}

function makeRules(reglas: string[] = []): RulesResult {
  return {
    apto_vegano: true,
    apto_celiaco: true,
    apto_sin_lactosa: true,
    reglas_aplicadas: reglas,
  };
}

const S0: Sello[] = [];
const S1: Sello[] = ['exceso en azúcares'];
const S2: Sello[] = ['exceso en azúcares', 'exceso en sodio'];
const S3: Sello[] = ['exceso en azúcares', 'exceso en sodio', 'exceso en calorías'];

const A0: Alergeno[] = [];
const A1: Alergeno[] = ['gluten'];
const A2: Alergeno[] = ['gluten', 'leche'];

describe('compute_risk — truth table (spec §4.2)', () => {
  // Row 1: sellos=0, alergenos=0, reglas=0 → bajo
  it('row 1: 0 sellos, 0 alergenos, 0 reglas → bajo', () => {
    expect(compute_risk(makeProduct(S0, A0), makeRules([]))).toBe('bajo');
  });

  // Row 1b (not in summary but in formula): 0 sellos, 0 alergenos, ≥1 reglas → medio
  it('row 1b: 0 sellos, 0 alergenos, 1 regla → medio', () => {
    expect(compute_risk(makeProduct(S0, A0), makeRules(['contiene_gluten']))).toBe('medio');
  });

  it('row 1b: 0 sellos, 0 alergenos, multiple reglas → medio', () => {
    expect(
      compute_risk(
        makeProduct(S0, A0),
        makeRules(['contiene_gluten', 'contiene_lacteos', 'contiene_origen_animal']),
      ),
    ).toBe('medio');
  });

  // Row 2: sellos=0, alergenos≥1, reglas=cualquiera → medio
  it.each<[Sello[], Alergeno[], string[], string]>([
    [S0, A1, [], 'medio'],
    [S0, A1, ['contiene_gluten'], 'medio'],
    [S0, A2, [], 'medio'],
    [S0, A2, ['contiene_gluten', 'contiene_lacteos'], 'medio'],
  ])('row 2: 0 sellos, alergenos=%j, reglas=%j → %s', (sellos, alergenos, reglas, expected) => {
    expect(compute_risk(makeProduct(sellos, alergenos), makeRules(reglas))).toBe(expected);
  });

  // Row 3: sellos=1, alergenos∈{0,1}, reglas=cualquiera → medio
  it.each<[Sello[], Alergeno[], string[], string]>([
    [S1, A0, [], 'medio'],
    [S1, A0, ['contiene_gluten'], 'medio'],
    [S1, A1, [], 'medio'],
    [S1, A1, ['contiene_gluten', 'contiene_origen_animal'], 'medio'],
  ])('row 3: 1 sello, alergenos=%j, reglas=%j → %s', (sellos, alergenos, reglas, expected) => {
    expect(compute_risk(makeProduct(sellos, alergenos), makeRules(reglas))).toBe(expected);
  });

  // Row 4: sellos=1, alergenos≥2, reglas=cualquiera → alto
  it.each<[Sello[], Alergeno[], string[], string]>([
    [S1, A2, [], 'alto'],
    [S1, A2, ['contiene_gluten'], 'alto'],
  ])('row 4: 1 sello, alergenos=%j (≥2), reglas=%j → %s', (sellos, alergenos, reglas, expected) => {
    expect(compute_risk(makeProduct(sellos, alergenos), makeRules(reglas))).toBe(expected);
  });

  // Row 5: sellos≥2, alergenos=cualquiera, reglas=cualquiera → alto
  it.each<[Sello[], Alergeno[], string[], string]>([
    [S2, A0, [], 'alto'],
    [S2, A1, [], 'alto'],
    [S2, A2, ['contiene_gluten'], 'alto'],
    [S3, A0, [], 'alto'],
    [S3, A2, ['contiene_gluten', 'contiene_lacteos'], 'alto'],
  ])(
    'row 5: sellos=%j (≥2), alergenos=%j, reglas=%j → %s',
    (sellos, alergenos, reglas, expected) => {
      expect(compute_risk(makeProduct(sellos, alergenos), makeRules(reglas))).toBe(expected);
    },
  );
});

describe('compute_risk — does NOT change based on confidence (spec §4.3)', () => {
  it('low confidence still returns the formula result', () => {
    const product: ProductExtraction = { ...makeProduct(S0, A0), confidence: 0.1 };
    expect(compute_risk(product, makeRules([]))).toBe('bajo');
  });

  it('high confidence still returns the formula result', () => {
    const product: ProductExtraction = { ...makeProduct(S2, A2), confidence: 0.99 };
    expect(compute_risk(product, makeRules([]))).toBe('alto');
  });
});
