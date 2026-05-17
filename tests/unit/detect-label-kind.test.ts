/**
 * Unit tests for the detect_label_kind pipeline step (US-05).
 * Spec: docs/specs/E01-onboarding-y-upload.md §6.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MockIaProvider } from '@/lib/ai';
import { ApiError } from '@schemas/errors';
import { cache } from '@/lib/cache';
import type { AnalysisContext, DetectedLabelKind } from '@/lib/pipeline/context';
import {
  DETECT_PROMPT_VERSION,
  LABEL_KIND_CACHE_TTL_SECONDS,
  detect_label_kind,
} from '@/lib/pipeline/steps/detect-label-kind';
import type { IaCallResult } from '@/lib/ai/types';

function makeCtx(overrides: Partial<AnalysisContext['file']> = {}): AnalysisContext {
  return {
    requestId: 'req-1',
    startedAt: new Date().toISOString(),
    file: {
      name: 'x.jpg',
      mime: 'image/jpeg',
      sizeBytes: 4,
      hash: `h-${Math.random().toString(36).slice(2)}`,
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      ...overrides,
    },
    steps: [],
  };
}

function call(raw: string): IaCallResult {
  return { raw, usage: { in: 10, out: 5 }, latencyMs: 7 };
}

const json = (obj: unknown) => JSON.stringify(obj);

beforeEach(() => {
  cache.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('detect_label_kind — Escenario 2: etiqueta válida pasa al siguiente step', () => {
  it('returns ctx with labelKind and a trace when is_food_label=true and confidence is high', async () => {
    const ia = new MockIaProvider();
    vi.spyOn(ia, 'classifyLabelKind').mockResolvedValue(
      call(json({ is_food_label: true, confidence: 0.95 })),
    );
    const ctx = makeCtx({ hash: 'happy' });

    const out = await detect_label_kind(ctx, ia);

    expect(out.labelKind).toEqual({
      is_food_label: true,
      confidence: 0.95,
      lowConfidence: false,
    });
    expect(out.steps).toHaveLength(1);
    expect(out.steps[0]).toMatchObject({ name: 'detect_label_kind', status: 'ok' });
    expect(out.steps[0]?.details).toMatchObject({
      cached: false,
      is_food_label: true,
      confidence: 0.95,
      promptVersion: DETECT_PROMPT_VERSION,
      model: 'Phi-4-multimodal-instruct',
      tokensIn: 10,
      tokensOut: 5,
    });
  });

  it('uses promptVersion=detect_label_kind-v1 on the provider call', async () => {
    const ia = new MockIaProvider();
    const spy = vi
      .spyOn(ia, 'classifyLabelKind')
      .mockResolvedValue(call(json({ is_food_label: true, confidence: 0.9 })));
    await detect_label_kind(makeCtx({ hash: 'pv' }), ia);
    expect(spy.mock.calls[0]?.[2]).toMatchObject({ promptVersion: DETECT_PROMPT_VERSION });
  });
});

describe('detect_label_kind — Escenario 1: no etiqueta + alta confianza → 422', () => {
  it('throws image_not_supported (422) when is_food_label=false and confidence >= 0.6', async () => {
    const ia = new MockIaProvider();
    vi.spyOn(ia, 'classifyLabelKind').mockResolvedValue(
      call(json({ is_food_label: false, confidence: 0.92 })),
    );
    await expect(detect_label_kind(makeCtx({ hash: 'reject' }), ia)).rejects.toMatchObject({
      code: 'image_not_supported',
      httpStatus: 422,
      details: { confidence: 0.92 },
    });
  });

  it('throws when confidence sits exactly on the 0.6 threshold', async () => {
    const ia = new MockIaProvider();
    vi.spyOn(ia, 'classifyLabelKind').mockResolvedValue(
      call(json({ is_food_label: false, confidence: 0.6 })),
    );
    await expect(detect_label_kind(makeCtx({ hash: 'edge' }), ia)).rejects.toBeInstanceOf(ApiError);
  });

  it('does NOT throw when is_food_label=false but confidence < 0.6 (low-conf rescue)', async () => {
    const ia = new MockIaProvider();
    vi.spyOn(ia, 'classifyLabelKind').mockResolvedValue(
      call(json({ is_food_label: false, confidence: 0.4 })),
    );
    const out = await detect_label_kind(makeCtx({ hash: 'rescue' }), ia);
    expect(out.labelKind).toMatchObject({ is_food_label: false, lowConfidence: true });
  });
});

describe('detect_label_kind — Escenario 3: baja confianza pasa con flag', () => {
  it('sets lowConfidence=true when confidence < 0.6 (even on a positive classification)', async () => {
    const ia = new MockIaProvider();
    vi.spyOn(ia, 'classifyLabelKind').mockResolvedValue(
      call(json({ is_food_label: true, confidence: 0.45 })),
    );
    const out = await detect_label_kind(makeCtx({ hash: 'low' }), ia);
    expect(out.labelKind).toEqual({
      is_food_label: true,
      confidence: 0.45,
      lowConfidence: true,
    });
    expect(out.steps[0]?.details).toMatchObject({ lowConfidence: true });
  });

  it('sets lowConfidence=false when confidence is exactly 0.6 (threshold is strict <)', async () => {
    const ia = new MockIaProvider();
    vi.spyOn(ia, 'classifyLabelKind').mockResolvedValue(
      call(json({ is_food_label: true, confidence: 0.6 })),
    );
    const out = await detect_label_kind(makeCtx({ hash: 'eq-thr' }), ia);
    expect(out.labelKind?.lowConfidence).toBe(false);
  });
});

describe('detect_label_kind — cache (label_kind:<hash>, 3600s TTL)', () => {
  it('hits the cache on second call and skips the provider', async () => {
    const ia = new MockIaProvider();
    const spy = vi
      .spyOn(ia, 'classifyLabelKind')
      .mockResolvedValue(call(json({ is_food_label: true, confidence: 0.9 })));
    const ctx = makeCtx({ hash: 'cache-1' });

    await detect_label_kind(ctx, ia);
    expect(spy).toHaveBeenCalledOnce();

    const second = await detect_label_kind(makeCtx({ hash: 'cache-1' }), ia);
    expect(spy).toHaveBeenCalledOnce();
    expect(second.labelKind?.is_food_label).toBe(true);
    expect(second.steps[0]?.details).toMatchObject({ cached: true });
  });

  it('persists with the documented 1 h TTL', async () => {
    const ia = new MockIaProvider();
    vi.spyOn(ia, 'classifyLabelKind').mockResolvedValue(
      call(json({ is_food_label: true, confidence: 0.9 })),
    );
    expect(LABEL_KIND_CACHE_TTL_SECONDS).toBe(3600);
    await detect_label_kind(makeCtx({ hash: 'ttl' }), ia);
    // Cache value present right after insert.
    expect(cache.size()).toBeGreaterThan(0);
  });

  it('re-throws image_not_supported from a cached not-food classification (no provider call)', async () => {
    const ia = new MockIaProvider();
    const spy = vi
      .spyOn(ia, 'classifyLabelKind')
      .mockResolvedValue(call(json({ is_food_label: false, confidence: 0.9 })));

    await expect(detect_label_kind(makeCtx({ hash: 'cached-reject' }), ia)).rejects.toMatchObject({
      code: 'image_not_supported',
    });
    expect(spy).toHaveBeenCalledOnce();

    await expect(detect_label_kind(makeCtx({ hash: 'cached-reject' }), ia)).rejects.toMatchObject({
      code: 'image_not_supported',
    });
    expect(spy).toHaveBeenCalledOnce(); // still 1 — cache short-circuited
  });

  it('different hashes do not collide in the cache', async () => {
    const ia = new MockIaProvider();
    vi.spyOn(ia, 'classifyLabelKind')
      .mockResolvedValueOnce(call(json({ is_food_label: true, confidence: 0.9 })))
      .mockResolvedValueOnce(call(json({ is_food_label: false, confidence: 0.4 })));
    const a = await detect_label_kind(makeCtx({ hash: 'h-a' }), ia);
    const b = await detect_label_kind(makeCtx({ hash: 'h-b' }), ia);
    expect((a.labelKind as DetectedLabelKind).is_food_label).toBe(true);
    expect((b.labelKind as DetectedLabelKind).is_food_label).toBe(false);
  });
});

describe('detect_label_kind — defensive on classifier output', () => {
  it('throws image_not_supported when the classifier returns unparseable JSON', async () => {
    const ia = new MockIaProvider();
    vi.spyOn(ia, 'classifyLabelKind').mockResolvedValue(call('not even json'));
    await expect(detect_label_kind(makeCtx({ hash: 'bad-1' }), ia)).rejects.toMatchObject({
      code: 'image_not_supported',
      details: { reason: 'classifier_returned_invalid_json' },
    });
  });

  it('throws image_not_supported when the classifier returns JSON missing required fields', async () => {
    const ia = new MockIaProvider();
    vi.spyOn(ia, 'classifyLabelKind').mockResolvedValue(call(json({ is_food_label: 'yes' })));
    await expect(detect_label_kind(makeCtx({ hash: 'bad-2' }), ia)).rejects.toMatchObject({
      code: 'image_not_supported',
    });
  });

  it('strips markdown fences before parsing classifier output', async () => {
    const ia = new MockIaProvider();
    vi.spyOn(ia, 'classifyLabelKind').mockResolvedValue(
      call('```json\n{"is_food_label": true, "confidence": 0.88}\n```'),
    );
    const out = await detect_label_kind(makeCtx({ hash: 'fenced' }), ia);
    expect(out.labelKind?.is_food_label).toBe(true);
  });
});
