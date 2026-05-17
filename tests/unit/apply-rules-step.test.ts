import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apply_rules } from '@/lib/pipeline/steps/apply-rules';
import type { AnalysisContext } from '@/lib/pipeline/context';
import type { ProductExtraction } from '@schemas/product';

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

function makeCtx(product?: ProductExtraction): AnalysisContext {
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
  };
}

beforeEach(() => {
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('apply_rules step', () => {
  it('throws if ctx.product is missing', async () => {
    await expect(apply_rules(makeCtx(undefined))).rejects.toThrow(/ctx\.product missing/);
  });

  it('overrides product.apto_* with the rules result + attaches ctx.rules', async () => {
    const ctx = makeCtx(
      makeProduct({
        ingredientes_detectados: ['harina de trigo'],
        // model lied about apto_celiaco — rules must win
        apto_celiaco: true,
      }),
    );
    const out = await apply_rules(ctx);
    expect(out.product?.apto_celiaco).toBe(false);
    expect(out.rules?.apto_celiaco).toBe(false);
    expect(out.rules?.reglas_aplicadas).toContain('contiene_gluten');
  });

  it('records divergedFromModel=true in the trace when rules disagree with the model', async () => {
    const ctx = makeCtx(
      makeProduct({
        ingredientes_detectados: ['leche en polvo'],
        apto_sin_lactosa: true, // model said apto, rules say no
      }),
    );
    const out = await apply_rules(ctx);
    expect(out.steps[0]).toMatchObject({ name: 'apply_rules', status: 'ok' });
    expect(out.steps[0]?.details).toMatchObject({
      divergedFromModel: true,
      reglas_aplicadas: ['contiene_lacteos', 'contiene_origen_animal'],
    });
  });

  it('records divergedFromModel=false when the model already agreed', async () => {
    const ctx = makeCtx(
      makeProduct({
        ingredientes_detectados: ['leche en polvo'],
        apto_vegano: false,
        apto_celiaco: true,
        apto_sin_lactosa: false,
      }),
    );
    const out = await apply_rules(ctx);
    expect(out.steps[0]?.details).toMatchObject({ divergedFromModel: false });
  });
});
