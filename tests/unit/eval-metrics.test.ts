import { describe, expect, it } from 'vitest';
import {
  EXTRACT_WEIGHTS,
  aggregateExtractScore,
  confidenceCalibration,
  confusionMatrix,
  exact,
  f1Set,
  fuzzy,
  levenshtein,
} from '../../evals/runner/metrics';

describe('levenshtein', () => {
  it.each<[string, string, number]>([
    ['', '', 0],
    ['abc', '', 3],
    ['', 'abc', 3],
    ['abc', 'abc', 0],
    ['kitten', 'sitting', 3],
    ['saturday', 'sunday', 3],
    ['a', 'b', 1],
  ])('%j vs %j → %i', (a, b, d) => {
    expect(levenshtein(a, b)).toBe(d);
  });
});

describe('fuzzy', () => {
  it('returns 1 for identical strings (ignoring case + trim)', () => {
    expect(fuzzy('Galletitas Oreo', '  galletitas oreo  ')).toBe(1);
  });

  it('returns 1 for two empty strings', () => {
    expect(fuzzy('', '')).toBe(1);
  });

  it('returns 0 when one is empty and the other is not', () => {
    expect(fuzzy('Oreo', '')).toBe(0);
    expect(fuzzy('', 'Oreo')).toBe(0);
  });

  it('returns a value between 0 and 1 for partial matches', () => {
    const score = fuzzy('Galletitas Oreo', 'Galletas Oreo');
    expect(score).toBeGreaterThan(0.85);
    expect(score).toBeLessThan(1);
  });

  it('passes spec §4.1 threshold of 0.7 for near matches', () => {
    expect(fuzzy('Galletitas Oreo', 'Galletitas Choco Oreo')).toBeGreaterThan(0.7);
  });
});

describe('exact', () => {
  it('returns 1 on equal primitives, 0 otherwise', () => {
    expect(exact('galletitas', 'galletitas')).toBe(1);
    expect(exact('galletitas', 'lácteos')).toBe(0);
    expect(exact(true, true)).toBe(1);
    expect(exact(true, false)).toBe(0);
    expect(exact(1, 1)).toBe(1);
  });
});

describe('f1Set', () => {
  it('returns perfect score when both sets are empty', () => {
    expect(f1Set([], [])).toEqual({ precision: 1, recall: 1, f1: 1 });
  });

  it('returns zeros when predicted is empty but expected is not', () => {
    const r = f1Set([], ['gluten']);
    expect(r.precision).toBe(0);
    expect(r.recall).toBe(0);
    expect(r.f1).toBe(0);
  });

  it('returns zeros when predicted has items but expected is empty', () => {
    const r = f1Set(['gluten'], []);
    expect(r.precision).toBe(0);
    expect(r.recall).toBe(0);
    expect(r.f1).toBe(0);
  });

  it('computes F1=1 on a perfect prediction', () => {
    const r = f1Set(['gluten', 'leche'], ['leche', 'gluten']);
    expect(r.f1).toBe(1);
  });

  it('computes precision/recall correctly on a partial match', () => {
    // TP=1 (gluten), FP=1 (soja extra), FN=1 (leche missed)
    // precision = 1/2 = 0.5, recall = 1/2 = 0.5, f1 = 0.5
    const r = f1Set(['gluten', 'soja'], ['gluten', 'leche']);
    expect(r.precision).toBe(0.5);
    expect(r.recall).toBe(0.5);
    expect(r.f1).toBe(0.5);
  });

  it('is case-insensitive and trims', () => {
    const r = f1Set(['Gluten', ' LECHE'], ['gluten', 'leche']);
    expect(r.f1).toBe(1);
  });

  it('deduplicates within each set', () => {
    const r = f1Set(['gluten', 'gluten'], ['gluten']);
    expect(r.precision).toBe(1);
    expect(r.recall).toBe(1);
  });
});

describe('confusionMatrix', () => {
  it('returns all-zero counts and F1=0 when given an empty list', () => {
    const r = confusionMatrix([]);
    expect(r).toMatchObject({ tp: 0, fp: 0, tn: 0, fn: 0, precision: 0, recall: 0, f1: 0 });
  });

  it('classifies all four quadrants correctly', () => {
    const r = confusionMatrix([
      { predicted: true, actual: true }, // TP
      { predicted: true, actual: true }, // TP
      { predicted: true, actual: false }, // FP
      { predicted: false, actual: true }, // FN
      { predicted: false, actual: false }, // TN
      { predicted: false, actual: false }, // TN
    ]);
    expect(r).toMatchObject({ tp: 2, fp: 1, tn: 2, fn: 1 });
    expect(r.precision).toBeCloseTo(2 / 3, 5);
    expect(r.recall).toBeCloseTo(2 / 3, 5);
    expect(r.f1).toBeCloseTo(2 / 3, 5);
  });

  it('returns F1=1 on a perfect classifier', () => {
    const r = confusionMatrix([
      { predicted: true, actual: true },
      { predicted: false, actual: false },
    ]);
    expect(r.f1).toBe(1);
  });
});

describe('confidenceCalibration', () => {
  it('returns 0 means when no samples are provided', () => {
    expect(confidenceCalibration([])).toEqual({ meanCorrect: 0, meanWrong: 0, diff: 0 });
  });

  it('positive diff when correct cases have higher confidence than wrong', () => {
    const r = confidenceCalibration([
      { confidence: 0.9, correct: true },
      { confidence: 0.8, correct: true },
      { confidence: 0.5, correct: false },
      { confidence: 0.4, correct: false },
    ]);
    expect(r.meanCorrect).toBeCloseTo(0.85);
    expect(r.meanWrong).toBeCloseTo(0.45);
    expect(r.diff).toBeCloseTo(0.4);
  });

  it('returns meanWrong=0 when no wrong samples exist', () => {
    const r = confidenceCalibration([{ confidence: 0.7, correct: true }]);
    expect(r.meanWrong).toBe(0);
    expect(r.diff).toBe(0.7);
  });

  it('returns meanCorrect=0 when no correct samples exist', () => {
    const r = confidenceCalibration([{ confidence: 0.3, correct: false }]);
    expect(r.meanCorrect).toBe(0);
    expect(r.diff).toBe(-0.3);
  });
});

describe('aggregateExtractScore', () => {
  it('weights match the spec §4.1 exactly (sum = 1.0)', () => {
    const sum = Object.values(EXTRACT_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 10);
  });

  it('returns 1.0 when every field scores perfectly', () => {
    expect(
      aggregateExtractScore({
        producto: 1,
        categoria: 1,
        ingredientes: 1,
        alergenos: 1,
        sellos: 1,
        aptitudes: 1,
        riesgo: 1,
      }),
    ).toBeCloseTo(1.0, 10);
  });

  it('returns 0 when every field scores zero', () => {
    expect(
      aggregateExtractScore({
        producto: 0,
        categoria: 0,
        ingredientes: 0,
        alergenos: 0,
        sellos: 0,
        aptitudes: 0,
        riesgo: 0,
      }),
    ).toBe(0);
  });

  it('matches the example from spec §10 (alergenos + sellos safety-critical)', () => {
    // Mirror the safety-critical contribution: missing alergenos drops the
    // score by 0.20, missing sellos by another 0.20.
    const allCorrect = aggregateExtractScore({
      producto: 1,
      categoria: 1,
      ingredientes: 1,
      alergenos: 1,
      sellos: 1,
      aptitudes: 1,
      riesgo: 1,
    });
    const missAlergenos = aggregateExtractScore({
      producto: 1,
      categoria: 1,
      ingredientes: 1,
      alergenos: 0,
      sellos: 1,
      aptitudes: 1,
      riesgo: 1,
    });
    expect(allCorrect - missAlergenos).toBeCloseTo(EXTRACT_WEIGHTS.alergenos, 10);
  });
});
