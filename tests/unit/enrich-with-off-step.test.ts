/**
 * Step `enrich_with_off` — verifica que (a) llama a OFF solo si hace falta,
 * (b) opcional vía env OFF_ENABLED, (c) no rompe el pipeline cuando OFF
 * falla / no hay match.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enrich_with_off } from '@/lib/pipeline/steps/enrich-with-off';
import type { AnalysisContext } from '@/lib/pipeline/context';
import type { OffMatch } from '@/lib/enrichment/off-client';
import type { ProductExtraction } from '@schemas/product';

function makeCtx(overrides: Partial<ProductExtraction> = {}): AnalysisContext {
  const product: ProductExtraction = {
    producto: 'Galletitas Test',
    categoria: 'galletitas',
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
  return {
    requestId: 'req-1',
    startedAt: new Date().toISOString(),
    file: { name: 'x.jpg', mime: 'image/jpeg', sizeBytes: 1, hash: 'h', buffer: Buffer.from('x') },
    steps: [],
    product,
    extractionRaw: JSON.stringify(product),
  } as AnalysisContext;
}

function makeOff(overrides: Partial<OffMatch> = {}): OffMatch {
  return {
    code: '7790001234',
    productName: 'Galletitas X',
    brands: 'Marca',
    countries: 'Argentina',
    ingredientsText: 'harina, sal',
    allergensTags: ['en:gluten'],
    additivesTags: [],
    nutriscoreGrade: null,
    ...overrides,
  };
}

beforeEach(() => {
  delete process.env.OFF_ENABLED;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('enrich_with_off', () => {
  it('skip cuando extracción ya tiene ingredientes Y alérgenos', async () => {
    const ctx = makeCtx({
      ingredientes_detectados: ['cacao'],
      alergenos: ['leche'],
    });
    const search = vi.fn();
    const result = await enrich_with_off(ctx, { search });
    expect(search).not.toHaveBeenCalled();
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]).toMatchObject({
      name: 'enrich_with_off',
      status: 'skipped',
      details: { reason: 'extraction_complete' },
    });
  });

  it('llama a OFF cuando faltan ingredientes y mergea', async () => {
    const ctx = makeCtx({ ingredientes_detectados: [], alergenos: [] });
    const search = vi.fn().mockResolvedValue(makeOff());
    const result = await enrich_with_off(ctx, { search });
    expect(search).toHaveBeenCalledWith('Galletitas Test');
    expect(result.product?.ingredientes_detectados).toEqual(['harina', 'sal']);
    expect(result.product?.alergenos).toEqual(['gluten']);
    expect(result.steps[0]).toMatchObject({ name: 'enrich_with_off', status: 'ok' });
  });

  it('skip cuando OFF no encuentra match', async () => {
    const ctx = makeCtx({ ingredientes_detectados: [], alergenos: [] });
    const search = vi.fn().mockResolvedValue(null);
    const result = await enrich_with_off(ctx, { search });
    expect(result.steps[0]).toMatchObject({
      name: 'enrich_with_off',
      status: 'skipped',
      details: { reason: 'no_match' },
    });
    // El producto no se modifica.
    expect(result.product?.ingredientes_detectados).toEqual([]);
  });

  it('no rompe el pipeline si OFF tira error', async () => {
    const ctx = makeCtx({ ingredientes_detectados: [], alergenos: [] });
    const search = vi.fn().mockRejectedValue(new Error('boom'));
    const result = await enrich_with_off(ctx, { search });
    expect(result.steps[0]).toMatchObject({
      name: 'enrich_with_off',
      status: 'skipped',
      details: { reason: 'error' },
    });
  });

  it('skipea cuando OFF_ENABLED=false', async () => {
    process.env.OFF_ENABLED = 'false';
    const ctx = makeCtx({ ingredientes_detectados: [], alergenos: [] });
    const search = vi.fn();
    const result = await enrich_with_off(ctx, { search });
    expect(search).not.toHaveBeenCalled();
    expect(result.steps[0]).toMatchObject({
      name: 'enrich_with_off',
      status: 'skipped',
      details: { reason: 'disabled_by_env' },
    });
  });
});
