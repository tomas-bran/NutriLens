import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MockIaProvider } from '@/lib/ai';
import { cache } from '@/lib/cache';
import {
  EXTRACT_PROMPT_VERSION,
  EXTRACT_TIMEOUT_MS,
  cacheExtraction,
  extract_with_ia,
} from '@/lib/pipeline/steps/extract-with-ia';
import type { AnalysisContext } from '@/lib/pipeline/context';
import type { ProductExtraction } from '@schemas/product';

const FIXED_PRODUCT: ProductExtraction = {
  producto: 'Galletitas Mock',
  categoria: 'galletitas',
  ingredientes_detectados: ['harina'],
  alergenos: ['gluten'],
  sellos: ['exceso en azúcares'],
  apto_vegano: false,
  apto_celiaco: false,
  apto_sin_lactosa: true,
  riesgo: 'alto',
  confidence: 0.9,
};

function makeCtx(overrides: Partial<AnalysisContext['file']> = {}): AnalysisContext {
  return {
    requestId: 'req-1',
    startedAt: new Date().toISOString(),
    file: {
      name: overrides.name ?? 'a.jpg',
      mime: overrides.mime ?? 'image/jpeg',
      sizeBytes: overrides.sizeBytes ?? 4,
      hash: overrides.hash ?? 'h'.repeat(64),
      buffer: overrides.buffer ?? Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
    },
    steps: [],
  };
}

beforeEach(() => {
  cache.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('extract_with_ia — cache miss (calls provider)', () => {
  it('asks the provider with extract_product-v1 + 25s timeout and stores raw output', async () => {
    const ia = new MockIaProvider();
    const spy = vi.spyOn(ia, 'analyzeLabel');
    const ctx = makeCtx({ hash: 'miss' });

    const out = await extract_with_ia(ctx, ia);

    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0]?.[2]).toMatchObject({
      promptVersion: EXTRACT_PROMPT_VERSION,
      timeoutMs: EXTRACT_TIMEOUT_MS,
    });
    expect(typeof out.extractionRaw).toBe('string');
    expect(out.product).toBeUndefined(); // validation is a separate step
  });

  it('appends a trace with promptVersion, model, tokens, latency, cached=false', async () => {
    const ia = new MockIaProvider();
    const out = await extract_with_ia(makeCtx({ hash: 'trace-miss' }), ia);
    expect(out.steps).toHaveLength(1);
    expect(out.steps[0]).toMatchObject({ name: 'extract_with_ia', status: 'ok' });
    expect(out.steps[0]?.details).toMatchObject({
      cached: false,
      promptVersion: EXTRACT_PROMPT_VERSION,
      model: 'Phi-4-multimodal-instruct',
    });
    expect(out.steps[0]?.details).toHaveProperty('tokensIn');
    expect(out.steps[0]?.details).toHaveProperty('tokensOut');
    expect(out.steps[0]?.details).toHaveProperty('latencyMs');
  });
});

describe('extract_with_ia — cache hit (skips provider)', () => {
  it('returns the cached product and never calls the provider', async () => {
    cacheExtraction('cached-hash', EXTRACT_PROMPT_VERSION, FIXED_PRODUCT);
    const ia = new MockIaProvider();
    const spy = vi.spyOn(ia, 'analyzeLabel');

    const out = await extract_with_ia(makeCtx({ hash: 'cached-hash' }), ia);

    expect(spy).not.toHaveBeenCalled();
    expect(out.product).toEqual(FIXED_PRODUCT);
    expect(out.steps[0]?.details).toMatchObject({
      cached: true,
      promptVersion: EXTRACT_PROMPT_VERSION,
    });
  });

  it('keys the cache by (hash, promptVersion) — same hash but different version misses', async () => {
    cacheExtraction('h1', 'extract_product-v0-old' as never, FIXED_PRODUCT);
    const ia = new MockIaProvider();
    const spy = vi.spyOn(ia, 'analyzeLabel');
    await extract_with_ia(makeCtx({ hash: 'h1' }), ia);
    expect(spy).toHaveBeenCalledOnce();
  });
});
