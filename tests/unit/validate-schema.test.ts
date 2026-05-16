import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MockIaProvider } from '@/lib/ai';
import { ApiError } from '@schemas/errors';
import { cache } from '@/lib/cache';
import type { AnalysisContext } from '@/lib/pipeline/context';
import { validate_schema } from '@/lib/pipeline/steps/validate-schema';
import { EXTRACT_PROMPT_VERSION } from '@/lib/pipeline/steps/extract-with-ia';
import type { IaCallResult } from '@/lib/ai/types';
import type { ProductExtraction } from '@schemas/product';

const VALID_PRODUCT: ProductExtraction = {
  producto: 'Galletitas Reales',
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

const VALID_RAW = JSON.stringify(VALID_PRODUCT);

function ctxWithRaw(raw: string | undefined): AnalysisContext {
  return {
    requestId: 'req-1',
    startedAt: new Date().toISOString(),
    file: {
      name: 'a.jpg',
      mime: 'image/jpeg',
      sizeBytes: 4,
      hash: `h${Math.random().toString(36).slice(2)}`,
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
    },
    steps: [],
    extractionRaw: raw,
  };
}

function callResult(raw: string): IaCallResult {
  return { raw, usage: { in: 0, out: 0 }, latencyMs: 1 };
}

beforeEach(() => {
  cache.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('validate_schema — happy path (US-14 Escenario 1+2)', () => {
  it('parses a valid raw, attaches the product, caches it, and traces attempt=1', async () => {
    const ia = new MockIaProvider();
    const spy = vi.spyOn(ia, 'analyzeLabel');
    const ctx = ctxWithRaw(VALID_RAW);

    const out = await validate_schema(ctx, ia);

    expect(spy).not.toHaveBeenCalled();
    expect(out.product).toEqual(VALID_PRODUCT);
    expect(out.steps[0]?.details).toMatchObject({ attempt: 1 });
    expect(cache.get(`extract:${ctx.file.hash}:${EXTRACT_PROMPT_VERSION}`)).toEqual(VALID_PRODUCT);
  });

  it('strips markdown fences before parsing', async () => {
    const ia = new MockIaProvider();
    const fenced = `\`\`\`json\n${VALID_RAW}\n\`\`\``;
    const out = await validate_schema(ctxWithRaw(fenced), ia);
    expect(out.product).toEqual(VALID_PRODUCT);
  });
});

describe('validate_schema — corrective retry (US-14 Escenario 3)', () => {
  it('retries with the corrective prompt and succeeds, tracing attempt=2 + corrective=true', async () => {
    const ia = new MockIaProvider();
    const spy = vi.spyOn(ia, 'analyzeLabel').mockResolvedValueOnce(callResult(VALID_RAW));
    const ctx = ctxWithRaw('{"producto": 123}'); // schema violation: producto must be string

    const out = await validate_schema(ctx, ia);

    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0]?.[2]).toMatchObject({
      promptVersion: 'extract_product-v1-corrective',
    });
    expect(spy.mock.calls[0]?.[2]?.extra).toMatchObject({
      previous: '{"producto": 123}',
    });
    expect(out.product).toEqual(VALID_PRODUCT);
    expect(out.steps[0]?.details).toMatchObject({
      attempt: 2,
      corrective: true,
      firstReason: 'schema_violation',
    });
  });

  it('retries on invalid JSON too (firstReason: invalid_json)', async () => {
    const ia = new MockIaProvider();
    vi.spyOn(ia, 'analyzeLabel').mockResolvedValueOnce(callResult(VALID_RAW));
    const out = await validate_schema(ctxWithRaw('not valid json {'), ia);
    expect(out.product).toEqual(VALID_PRODUCT);
    expect(out.steps[0]?.details).toMatchObject({ firstReason: 'invalid_json' });
  });

  it('throws extraction_invalid 422 when the corrective retry also fails', async () => {
    const ia = new MockIaProvider();
    vi.spyOn(ia, 'analyzeLabel').mockResolvedValueOnce(callResult('{"still":"bad"}'));
    await expect(validate_schema(ctxWithRaw('{"producto": null}'), ia)).rejects.toMatchObject({
      code: 'extraction_invalid',
      httpStatus: 422,
      details: {
        firstReason: 'schema_violation',
        secondReason: 'schema_violation',
      },
    });
  });

  it('throws extraction_invalid when both attempts return unparseable JSON', async () => {
    const ia = new MockIaProvider();
    vi.spyOn(ia, 'analyzeLabel').mockResolvedValueOnce(callResult('still {bad'));
    await expect(validate_schema(ctxWithRaw('{not json'), ia)).rejects.toMatchObject({
      code: 'extraction_invalid',
      details: { firstReason: 'invalid_json', secondReason: 'invalid_json' },
    });
  });
});

describe('validate_schema — defensive', () => {
  it('throws extraction_invalid when ctx.extractionRaw is missing', async () => {
    await expect(
      validate_schema(ctxWithRaw(undefined), new MockIaProvider()),
    ).rejects.toBeInstanceOf(ApiError);
  });
});
