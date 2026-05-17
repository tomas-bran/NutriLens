import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MockIaProvider } from '@/lib/ai';
import { cache } from '@/lib/cache';
import {
  EXPLAIN_CACHE_TTL_SECONDS,
  EXPLAIN_PROMPT_VERSION,
  generate_explanation,
} from '@/lib/pipeline/steps/generate-explanation';
import type { AnalysisContext } from '@/lib/pipeline/context';
import type { ProductExtraction } from '@schemas/product';

function makeProduct(): ProductExtraction {
  return {
    producto: 'Test',
    categoria: 'galletitas',
    ingredientes_detectados: ['harina'],
    alergenos: ['gluten'],
    sellos: ['exceso en azúcares'],
    apto_vegano: false,
    apto_celiaco: false,
    apto_sin_lactosa: true,
    riesgo: 'medio',
    confidence: 0.9,
  };
}

function makeCtx(): AnalysisContext {
  return {
    requestId: 'req-1',
    startedAt: new Date().toISOString(),
    file: {
      name: 'a.jpg',
      mime: 'image/jpeg',
      sizeBytes: 4,
      hash: `h-${Math.random().toString(36).slice(2)}`,
      buffer: Buffer.from([0xff]),
    },
    steps: [],
    product: makeProduct(),
    rules: {
      apto_vegano: false,
      apto_celiaco: false,
      apto_sin_lactosa: true,
      reglas_aplicadas: ['contiene_gluten'],
    },
  };
}

beforeEach(() => {
  cache.clear();
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
});

afterEach(() => {
  cache.clear();
  vi.restoreAllMocks();
});

describe('generate_explanation step', () => {
  it('throws if ctx.product is missing', async () => {
    const ctx = makeCtx();
    delete ctx.product;
    await expect(generate_explanation(ctx, new MockIaProvider())).rejects.toThrow(
      /ctx\.product missing/,
    );
  });

  it('calls the provider with the explain prompt + product + reglas extra', async () => {
    const ia = new MockIaProvider();
    const spy = vi.spyOn(ia, 'generateExplanation');
    const ctx = makeCtx();
    await generate_explanation(ctx, ia);
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0]?.[1]).toMatchObject({
      promptVersion: EXPLAIN_PROMPT_VERSION,
      timeoutMs: 10_000,
      extra: { reglas_aplicadas: 'contiene_gluten' },
    });
  });

  it('sanitizes the model output (idempotent on a clean MockIaProvider response)', async () => {
    const ia = new MockIaProvider();
    const out = await generate_explanation(makeCtx(), ia);
    expect(out.explanation).toContain('NutriLens es un asistente informativo');
  });

  it('caches the sanitized output; second call skips the provider', async () => {
    const ia = new MockIaProvider();
    const spy = vi.spyOn(ia, 'generateExplanation');
    const ctx = makeCtx();
    const ctx2 = { ...ctx, steps: [] };

    await generate_explanation(ctx, ia);
    expect(spy).toHaveBeenCalledOnce();

    const second = await generate_explanation(ctx2, ia);
    expect(spy).toHaveBeenCalledOnce(); // no second call
    expect(second.steps[0]?.details).toMatchObject({ cached: true });
  });

  it('uses the documented 24h cache TTL', () => {
    expect(EXPLAIN_CACHE_TTL_SECONDS).toBe(60 * 60 * 24);
  });

  it('records sanitization counters in the trace when the model returns a blocked phrase', async () => {
    const ia = new MockIaProvider();
    vi.spyOn(ia, 'generateExplanation').mockResolvedValue({
      raw: 'No consumir este producto.',
      usage: { in: 0, out: 0 },
      latencyMs: 1,
    });
    const out = await generate_explanation(makeCtx(), ia);
    expect(out.explanation).toContain('[texto removido]');
    expect(out.explanation).toContain('NutriLens es un asistente informativo');
    expect(out.steps[0]?.details).toMatchObject({
      patternsRemoved: 1,
      disclaimerAppended: true,
    });
  });

  it('tolerates provider failure: ctx.explanation stays undefined and trace is skipped (spec §5.4)', async () => {
    const ia = new MockIaProvider();
    vi.spyOn(ia, 'generateExplanation').mockRejectedValue(new Error('model timeout'));
    const out = await generate_explanation(makeCtx(), ia);
    expect(out.explanation).toBeUndefined();
    expect(out.steps[0]).toMatchObject({
      name: 'generate_explanation',
      status: 'skipped',
    });
    expect(out.steps[0]?.details).toMatchObject({
      reason: 'model_failed',
      error: 'model timeout',
    });
  });

  it('tolerated failure does NOT poison the cache', async () => {
    const ia = new MockIaProvider();
    vi.spyOn(ia, 'generateExplanation').mockRejectedValue(new Error('boom'));
    await generate_explanation(makeCtx(), ia);
    expect(cache.size()).toBe(0);
  });
});
