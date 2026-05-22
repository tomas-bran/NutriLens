/**
 * @vitest-environment node
 *
 * Integration test for the US-22 Escenario 3 dedup contract:
 *   POST /api/analyze with the same image twice → second request returns the
 *   same product id (same DB row), with cachedFromDedup=true and no new
 *   image/DB write.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { existsSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { POST } from '@/app/api/analyze/route';
import { _resetIaProvider } from '@/lib/ai';
import { cache } from '@/lib/cache';

const prisma = new PrismaClient();
const createdHashes: string[] = [];

function makeRequest(body: Buffer): Request {
  const form = new FormData();
  const bytes = new Uint8Array(body);
  form.append('file', new File([bytes], 'fixture.jpg', { type: 'image/jpeg' }));
  return new Request('http://localhost/api/analyze', { method: 'POST', body: form });
}

function sha256(b: Buffer): string {
  return createHash('sha256').update(b).digest('hex');
}

beforeEach(() => {
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  cache.clear();
  _resetIaProvider();
  process.env.IA_PROVIDER = 'mock';
  // El step `enrich_with_off` hace fetch a la API pública de Open Food Facts
  // (timeout 3s). En tests integration que corren el pipeline completo dos
  // veces (dedup) el total se va arriba de los 5s default y se rompe. Como
  // el feature de OFF se cubre en sus propios unit tests (enrich-with-off-step
  // + enrichment-merge-off), acá lo desactivamos via env opt-out.
  process.env.OFF_ENABLED = 'false';
});

afterEach(async () => {
  vi.restoreAllMocks();
  cache.clear();
  _resetIaProvider();
  for (const hash of createdHashes) {
    const path = resolve(process.cwd(), 'uploads', `${hash}.jpg`);
    if (existsSync(path)) rmSync(path);
  }
  createdHashes.length = 0;
  await prisma.product.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/analyze — dedup by fileHash (US-22 Escenario 3)', () => {
  it('second upload of the same image returns the same product id + cachedFromDedup=true', async () => {
    const body = Buffer.from(`dedup-${Math.random()}-${Date.now()}`);
    createdHashes.push(sha256(body));

    const r1 = await POST(makeRequest(body) as never);
    expect(r1.status).toBe(200);
    const body1 = await r1.json();
    expect(body1.cachedFromDedup).toBe(false);

    const r2 = await POST(makeRequest(body) as never);
    expect(r2.status).toBe(200);
    const body2 = await r2.json();
    expect(body2.cachedFromDedup).toBe(true);
    expect(body2.id).toBe(body1.id);
    expect(body2.savedAt).toBe(body1.savedAt);

    // Spec invariant: at most one row per fileHash.
    const count = await prisma.product.count({ where: { id: body1.id } });
    expect(count).toBe(1);
  });

  it('two different images create two different rows', async () => {
    const a = Buffer.from(`a-${Math.random()}-${Date.now()}`);
    const b = Buffer.from(`b-${Math.random()}-${Date.now()}`);
    createdHashes.push(sha256(a), sha256(b));

    const r1 = await POST(makeRequest(a) as never);
    const r2 = await POST(makeRequest(b) as never);
    const body1 = await r1.json();
    const body2 = await r2.json();
    expect(body1.id).not.toBe(body2.id);
    expect(body1.cachedFromDedup).toBe(false);
    expect(body2.cachedFromDedup).toBe(false);
    expect(await prisma.product.count()).toBe(2);
  });

  it('persist trace shows status=skipped reason=duplicate_hash on the second call', async () => {
    const body = Buffer.from(`trace-${Math.random()}-${Date.now()}`);
    createdHashes.push(sha256(body));

    await POST(makeRequest(body) as never);
    const r2 = await POST(makeRequest(body) as never);
    const body2 = await r2.json();
    const persistTrace = (
      body2.pipelineTrace as Array<{
        name: string;
        status: string;
        details?: Record<string, unknown>;
      }>
    ).find((t) => t.name === 'persist');
    expect(persistTrace).toMatchObject({
      status: 'skipped',
      details: { reason: 'duplicate_hash' },
    });
  });
});
