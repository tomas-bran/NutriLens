import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { compute_risk } from '@/lib/pipeline/steps/compute-risk';
import type { AnalysisContext } from '@/lib/pipeline/context';
import type { ProductExtraction } from '@schemas/product';
import type { RulesResult } from '@/lib/rules/apply';

function makeProduct(overrides: Partial<ProductExtraction> = {}): ProductExtraction {
  return {
    producto: 'X',
    categoria: 'otros',
    ingredientes_detectados: [],
    alergenos: [],
    sellos: [],
    apto_vegano: true,
    apto_celiaco: true,
    apto_sin_lactosa: true,
    riesgo: 'bajo',
    confidence: 0.9,
    ...overrides,
  };
}

function makeCtx(product?: ProductExtraction, rules?: RulesResult): AnalysisContext {
  return {
    requestId: 'req-x',
    startedAt: new Date().toISOString(),
    file: {
      name: 'a.jpg',
      mime: 'image/jpeg',
      sizeBytes: 4,
      hash: 'h'.repeat(64),
      buffer: Buffer.from([0xff]),
    },
    steps: [],
    product,
    rules,
  };
}

const defaultRules: RulesResult = {
  apto_vegano: true,
  apto_celiaco: true,
  apto_sin_lactosa: true,
  reglas_aplicadas: [],
};

beforeEach(() => {
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('compute_risk step', () => {
  it('throws if ctx.product is missing', async () => {
    await expect(compute_risk(makeCtx(undefined, defaultRules))).rejects.toThrow(
      /ctx\.product missing/,
    );
  });

  it('throws if ctx.rules is missing', async () => {
    await expect(compute_risk(makeCtx(makeProduct(), undefined))).rejects.toThrow(
      /ctx\.rules missing/,
    );
  });

  it('overrides product.riesgo with the rule-derived value (model said bajo, rules say alto)', async () => {
    const ctx = makeCtx(
      makeProduct({
        sellos: ['exceso en azúcares', 'exceso en sodio'],
        riesgo: 'bajo', // model lied
      }),
      defaultRules,
    );
    const out = await compute_risk(ctx);
    expect(out.product?.riesgo).toBe('alto');
    expect(out.steps[0]).toMatchObject({ name: 'compute_risk', status: 'ok' });
    expect(out.steps[0]?.details).toMatchObject({
      riesgo: 'alto',
      sellos: 2,
      alergenos: 0,
    });
  });

  it('keeps the rule-derived value when it matches the model', async () => {
    const ctx = makeCtx(makeProduct({ riesgo: 'bajo' }), defaultRules);
    const out = await compute_risk(ctx);
    expect(out.product?.riesgo).toBe('bajo');
  });
});
