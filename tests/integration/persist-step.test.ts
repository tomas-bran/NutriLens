/**
 * @vitest-environment node
 *
 * Integration tests for the persist pipeline step (US-22). Hits a real
 * Postgres so the unique constraint and Prisma generated types actually
 * fire.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { persist } from '@/lib/pipeline/steps/persist';
import type { AnalysisContext } from '@/lib/pipeline/context';
import type { ProductExtraction } from '@schemas/product';
import type { RulesResult } from '@/lib/rules/apply';

const prisma = new PrismaClient();

function makeProduct(overrides: Partial<ProductExtraction> = {}): ProductExtraction {
  return {
    producto: 'Persist Test',
    categoria: 'galletitas',
    ingredientes_detectados: ['harina de trigo'],
    alergenos: ['gluten'],
    sellos: ['exceso en azúcares'],
    apto_vegano: false,
    apto_celiaco: false,
    apto_sin_lactosa: true,
    riesgo: 'alto',
    confidence: 0.9,
    ...overrides,
  };
}

const RULES: RulesResult = {
  apto_vegano: false,
  apto_celiaco: false,
  apto_sin_lactosa: true,
  reglas_aplicadas: ['contiene_gluten'],
};

function makeCtx(hash: string, product = makeProduct()): AnalysisContext {
  createdHashes.push(hash);
  return {
    requestId: `req-${Math.random().toString(36).slice(2)}`,
    startedAt: new Date().toISOString(),
    file: {
      name: 'a.jpg',
      mime: 'image/jpeg',
      sizeBytes: 4,
      hash,
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
    },
    steps: [],
    product,
    rules: RULES,
    extractionRaw: JSON.stringify(product),
    explanation: 'Producto con gluten. Recordá que NutriLens es un asistente informativo.',
  };
}

const createdHashes: string[] = [];

beforeEach(() => {
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
});

afterEach(async () => {
  vi.restoreAllMocks();
  // Persist writes images to ./uploads via the default LocalStorage. Clean
  // the files we created (not the directory) so we don't pollute dev uploads.
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

describe('persist step (US-22)', () => {
  it('Escenario 1: persists a fresh fileHash with all fields', async () => {
    const hash = `fresh-${Math.random().toString(36).slice(2)}`;
    const out = await persist(makeCtx(hash));

    expect(out.saved).toBeDefined();
    expect(out.cachedFromDedup).toBe(false);
    expect(out.saved?.fileHash).toBe(hash);
    expect(out.saved?.nombre).toBe('Persist Test');
    expect(out.saved?.aptoCeliaco).toBe(false);
    expect(out.saved?.riesgo).toBe('alto');
    expect(out.saved?.imagenPath).toMatch(/^\/uploads\/[a-z0-9-]+\.jpg$/);
    expect(out.steps[0]).toMatchObject({ name: 'persist', status: 'ok' });
  });

  it('Escenario 3: dedup — second call with same fileHash returns the existing row without inserting', async () => {
    const hash = `dup-${Math.random().toString(36).slice(2)}`;
    const first = await persist(makeCtx(hash));
    const second = await persist(makeCtx(hash));

    expect(second.cachedFromDedup).toBe(true);
    expect(second.saved?.id).toBe(first.saved?.id);
    expect(second.steps[0]).toMatchObject({
      name: 'persist',
      status: 'skipped',
    });
    expect(second.steps[0]?.details).toMatchObject({ reason: 'duplicate_hash' });

    const count = await prisma.product.count({ where: { fileHash: hash } });
    expect(count).toBe(1);
  });

  it('maps Zod categoria "sin TACC" to Prisma "sin_tacc" on insert', async () => {
    const hash = `sintacc-${Math.random().toString(36).slice(2)}`;
    await persist(makeCtx(hash, makeProduct({ categoria: 'sin TACC' })));
    const row = await prisma.product.findUnique({ where: { fileHash: hash } });
    expect(row?.categoria).toBe('sin_tacc');
  });

  it('throws when ctx is missing required fields', async () => {
    const ctx = makeCtx('x') as AnalysisContext;
    delete ctx.product;
    await expect(persist(ctx)).rejects.toThrow(/context not ready/);
  });
});
