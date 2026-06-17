/**
 * @vitest-environment node
 *
 * Integration tests for "Analizados por vos": `POST /api/analyze` must link the
 * persisted product to the logged-in user (ProductAnalysis), including the
 * dedup path, and the per-user relation query must scope the catalog correctly.
 *
 * `getUserId` is mocked so we can drive the "current user" deterministically.
 * IA provider = mock; OFF disabled (same rationale as api-analyze.test.ts).
 */
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const { getUserIdMock } = vi.hoisted(() => ({ getUserIdMock: vi.fn() }));
vi.mock('@/lib/auth/current-user', () => ({
  getUserId: getUserIdMock,
  requireUserId: getUserIdMock,
  Unauthorized: class Unauthorized extends Error {},
}));

import { POST } from '@/app/api/analyze/route';
import { _resetIaProvider } from '@/lib/ai';
import { cache } from '@/lib/cache';

const prisma = new PrismaClient();
const UPLOADS_DIR = resolve(process.cwd(), 'uploads');

function makeRequest(body: Buffer): Request {
  const formData = new FormData();
  const file = new File([new Uint8Array(body)], 'label.jpg', { type: 'image/jpeg' });
  formData.append('file', file);
  return new Request('http://localhost/api/analyze', { method: 'POST', body: formData });
}

async function analyzeAs(userId: string | null, body: Buffer) {
  getUserIdMock.mockResolvedValue(userId);
  const res = await POST(makeRequest(body) as never);
  return res;
}

beforeEach(() => {
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  cache.clear();
  _resetIaProvider();
  process.env.IA_PROVIDER = 'mock';
  process.env.OFF_ENABLED = 'false';
});

afterEach(async () => {
  vi.restoreAllMocks();
  cache.clear();
  _resetIaProvider();
  await prisma.productAnalysis.deleteMany();
  await prisma.product.deleteMany();
});

afterAll(async () => {
  if (existsSync(UPLOADS_DIR)) {
    for (const f of readdirSync(UPLOADS_DIR)) {
      if (/^[a-f0-9]{64}\.(jpg|png|pdf|bin)$/.test(f)) {
        rmSync(resolve(UPLOADS_DIR, f), { force: true });
      }
    }
  }
  await prisma.$disconnect();
});

describe('POST /api/analyze — "Analizados por vos" link', () => {
  it('links the analyzed product to the logged-in user', async () => {
    const res = await analyzeAs('user-a', Buffer.from('link-' + Math.random()));
    expect(res.status).toBe(200);
    const { id } = await res.json();

    const link = await prisma.productAnalysis.findUnique({
      where: { userId_productId: { userId: 'user-a', productId: id } },
    });
    expect(link).not.toBeNull();
  });

  it('does NOT create a link when there is no session', async () => {
    const res = await analyzeAs(null, Buffer.from('anon-' + Math.random()));
    expect(res.status).toBe(200);
    const { id } = await res.json();

    const count = await prisma.productAnalysis.count({ where: { productId: id } });
    expect(count).toBe(0);
  });

  it('links a second user to an existing product on the dedup path', async () => {
    const buffer = Buffer.from('dedup-' + Math.random());

    const r1 = await analyzeAs('user-a', buffer);
    const { id: id1 } = await r1.json();

    const r2 = await analyzeAs('user-b', buffer);
    const body2 = await r2.json();
    expect(body2.cachedFromDedup).toBe(true);
    expect(body2.id).toBe(id1); // same product (same hash)

    const links = await prisma.productAnalysis.findMany({ where: { productId: id1 } });
    expect(links.map((l) => l.userId).sort()).toEqual(['user-a', 'user-b']);
  });

  it('re-analyzing the same product by the same user is idempotent (no duplicate link)', async () => {
    const buffer = Buffer.from('idem-' + Math.random());
    const r1 = await analyzeAs('user-a', buffer);
    const { id } = await r1.json();
    await analyzeAs('user-a', buffer);

    const count = await prisma.productAnalysis.count({ where: { productId: id } });
    expect(count).toBe(1);
  });

  it('the per-user relation query scopes the catalog to the user (mios filter semantics)', async () => {
    const ra = await analyzeAs('user-a', Buffer.from('mine-' + Math.random()));
    const { id: mineId } = await ra.json();
    const rb = await analyzeAs('user-b', Buffer.from('theirs-' + Math.random()));
    const { id: theirsId } = await rb.json();

    // This is exactly the `where` the /catalogo page builds for ?filtro=mios.
    const mine = await prisma.product.findMany({
      where: { analyses: { some: { userId: 'user-a' } } },
    });
    const ids = mine.map((p) => p.id);
    expect(ids).toContain(mineId);
    expect(ids).not.toContain(theirsId);
  });
});
