/**
 * Snapshot tests for the extract → sanitize → validate → enrich pipeline.
 *
 * Each fixture under `tests/fixtures/ai/extract/<category>/` ships:
 *   - `raw.json`:      mock LLM output (what the model would return) +
 *                      `image` string marker + `description`.
 *   - `expected.json`: the normalized ProductExtraction after the full
 *                      post-processing chain.
 *
 * The test feeds raw.modelOutput through MockIaProvider (stubbed to return
 * that exact JSON) → POST /api/analyze → asserts product equals expected.
 * Adding a new fixture = adding a new directory; the loop picks it up.
 *
 * Covers US-10 (ingredientes), US-11 (alergenos + inference fallback),
 * US-12 (sellos with out-of-enum drop), US-13 (categoria coercion).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// getUserId (→ @/lib/auth → next-auth) no resuelve bajo vitest; lo mockeamos a
// null porque estos tests no ejercitan el vínculo usuario↔producto.
vi.mock('@/lib/auth/current-user', () => ({
  getUserId: vi.fn().mockResolvedValue(null),
}));

import { POST } from '@/app/api/analyze/route';
import { MockIaProvider, _resetIaProvider, getIaProvider } from '@/lib/ai';
import { cache } from '@/lib/cache';

const FIXTURES_DIR = join(__dirname, '..', 'fixtures', 'ai', 'extract');

interface Fixture {
  name: string;
  description: string;
  image: string;
  modelOutput: unknown;
}

function loadFixture(dirname: string): { raw: Fixture; expected: unknown } {
  const raw = JSON.parse(readFileSync(join(FIXTURES_DIR, dirname, 'raw.json'), 'utf-8')) as Fixture;
  const expected = JSON.parse(readFileSync(join(FIXTURES_DIR, dirname, 'expected.json'), 'utf-8'));
  return { raw: { ...raw, name: dirname }, expected };
}

function listFixtures(): string[] {
  return readdirSync(FIXTURES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

function makeMultipartRequest(payload: Buffer): Request {
  const form = new FormData();
  form.append('file', new File([new Uint8Array(payload)], 'fixture.jpg', { type: 'image/jpeg' }));
  return new Request('http://localhost/api/analyze', { method: 'POST', body: form });
}

beforeEach(() => {
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  cache.clear();
  _resetIaProvider();
  process.env.IA_PROVIDER = 'mock';
  // El step `enrich_with_off` hace fetch a Open Food Facts (3s timeout).
  // Los snapshots fixtures testean el flujo extract→sanitize→validate y se
  // desbordan los 5s al pasar por OFF. Su feature tiene cobertura propia.
  process.env.OFF_ENABLED = 'false';
});

afterEach(() => {
  vi.restoreAllMocks();
  cache.clear();
  _resetIaProvider();
});

describe('extract → sanitize → validate → enrich — snapshot fixtures', () => {
  const cases = listFixtures();
  expect(cases.length).toBeGreaterThanOrEqual(5);

  it.each(cases)('fixture %s produces the expected normalized product', async (name) => {
    const { raw, expected } = loadFixture(name);
    const ia = getIaProvider();
    if (!(ia instanceof MockIaProvider)) throw new Error('IA_PROVIDER must be mock');
    vi.spyOn(ia, 'analyzeLabel').mockResolvedValue({
      raw: JSON.stringify(raw.modelOutput),
      usage: { in: 0, out: 0 },
      latencyMs: 1,
    });

    // Unique buffer per fixture so the extract_with_ia cache doesn't bleed
    // between cases (cache key includes the file hash).
    const res = await POST(makeMultipartRequest(Buffer.from(`fx-${name}-${Date.now()}`)) as never);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { product: unknown };
    expect(body.product).toEqual(expected);
  });
});
