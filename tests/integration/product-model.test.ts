/**
 * Integration tests for the Product model (US-21).
 *
 * Covers the AC of US-21 + casos borde of E04 §2:
 *   - Tabla products con todos los campos del spec
 *   - id único (UUID) asignado automáticamente
 *   - createdAt asignado automáticamente
 *   - fileHash unique constraint (dedup, E04 §11 race-en-deduplicación)
 *   - explanation opcional
 *   - Indexes presentes (categoria, riesgo, createdAt)
 *   - Filtros básicos por categoria/riesgo
 *
 * Requires a live Postgres reachable via DATABASE_URL. Locally: `docker compose up -d db`.
 * CI: provided by the `postgres` service in .github/workflows/ci.yml.
 */
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function makeProduct(
  overrides: Partial<Prisma.ProductCreateInput> = {},
): Prisma.ProductCreateInput {
  return {
    fileHash: `hash-${Math.random().toString(36).slice(2)}-${Date.now()}`,
    nombre: 'Galletitas Choco Crunch',
    categoria: 'galletitas',
    ingredientes: JSON.stringify(['harina de trigo', 'azúcar', 'cacao']),
    alergenos: JSON.stringify(['gluten', 'leche']),
    sellos: JSON.stringify(['exceso en azúcares', 'exceso en grasas saturadas']),
    aptoVegano: false,
    aptoCeliaco: false,
    aptoSinLactosa: false,
    riesgo: 'alto',
    confidence: 0.94,
    reglasAplicadas: JSON.stringify(['contiene_gluten', 'contiene_lacteos']),
    explanation: 'Contiene gluten y leche, no apto para celíacos ni intolerantes a la lactosa.',
    jsonRaw: JSON.stringify({ producto: 'Galletitas Choco Crunch' }),
    pipelineTrace: JSON.stringify([
      { name: 'validate_file', status: 'ok', startedAt: '2026-05-16T10:00:00.000Z', durationMs: 5 },
    ]),
    imagenPath: '/uploads/abc.jpg',
    promptVersion: 'extract_product-v1',
    ...overrides,
  };
}

beforeEach(async () => {
  await prisma.product.deleteMany();
});

afterAll(async () => {
  await prisma.product.deleteMany();
  await prisma.$disconnect();
});

describe('Product — insert + retrieve roundtrip', () => {
  it('persists every field defined in spec E04 §2', async () => {
    const input = makeProduct({ fileHash: 'roundtrip-hash' });
    const created = await prisma.product.create({ data: input });
    const fetched = await prisma.product.findUnique({ where: { id: created.id } });

    expect(fetched).not.toBeNull();
    expect(fetched).toMatchObject({
      fileHash: input.fileHash,
      nombre: input.nombre,
      categoria: input.categoria,
      ingredientes: input.ingredientes,
      alergenos: input.alergenos,
      sellos: input.sellos,
      aptoVegano: input.aptoVegano,
      aptoCeliaco: input.aptoCeliaco,
      aptoSinLactosa: input.aptoSinLactosa,
      riesgo: input.riesgo,
      confidence: input.confidence,
      reglasAplicadas: input.reglasAplicadas,
      explanation: input.explanation,
      jsonRaw: input.jsonRaw,
      pipelineTrace: input.pipelineTrace,
      imagenPath: input.imagenPath,
      promptVersion: input.promptVersion,
    });
  });

  it('roundtrips JSON-serialized arrays without losing data', async () => {
    const ingredientes = ['harina de trigo', 'azúcar', 'sal', 'manteca'];
    const created = await prisma.product.create({
      data: makeProduct({ fileHash: 'json-roundtrip', ingredientes: JSON.stringify(ingredientes) }),
    });
    expect(JSON.parse(created.ingredientes)).toEqual(ingredientes);
  });

  it('preserves characters with diacritics and unicode in nombre/sellos', async () => {
    const created = await prisma.product.create({
      data: makeProduct({
        fileHash: 'unicode-hash',
        nombre: 'Alfajor Tradición Argentina — café 🇦🇷',
        sellos: JSON.stringify(['exceso en azúcares', 'exceso en sodio']),
      }),
    });
    expect(created.nombre).toBe('Alfajor Tradición Argentina — café 🇦🇷');
    expect(JSON.parse(created.sellos)).toContain('exceso en azúcares');
  });
});

describe('Product — defaults (Escenario 2: ID único)', () => {
  it('assigns a UUID id automatically', async () => {
    const a = await prisma.product.create({ data: makeProduct({ fileHash: 'uuid-a' }) });
    const b = await prisma.product.create({ data: makeProduct({ fileHash: 'uuid-b' }) });
    expect(a.id).toMatch(UUID_RE);
    expect(b.id).toMatch(UUID_RE);
    expect(a.id).not.toBe(b.id);
  });

  it('sets createdAt at insertion time', async () => {
    const before = Date.now();
    const created = await prisma.product.create({ data: makeProduct({ fileHash: 'createdat' }) });
    const after = Date.now();
    expect(created.createdAt.getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(created.createdAt.getTime()).toBeLessThanOrEqual(after + 1000);
  });

  it('accepts a null explanation (optional field)', async () => {
    const created = await prisma.product.create({
      data: makeProduct({ fileHash: 'null-explanation', explanation: null }),
    });
    expect(created.explanation).toBeNull();
  });
});

describe('Product — fileHash unique constraint (deduplicación E04 §3.1)', () => {
  it('rejects a second insert with the same fileHash', async () => {
    await prisma.product.create({ data: makeProduct({ fileHash: 'duplicate' }) });
    await expect(
      prisma.product.create({ data: makeProduct({ fileHash: 'duplicate' }) }),
    ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
  });

  it('classifies the duplicate violation as Prisma error code P2002', async () => {
    await prisma.product.create({ data: makeProduct({ fileHash: 'dup-code' }) });
    try {
      await prisma.product.create({ data: makeProduct({ fileHash: 'dup-code' }) });
      throw new Error('expected unique constraint violation');
    } catch (err) {
      expect(err).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
      expect((err as Prisma.PrismaClientKnownRequestError).code).toBe('P2002');
    }
  });
});

describe('Product — indexes (Escenario 1: schema definido)', () => {
  it('exposes the unique index on fileHash and 3 lookup indexes', async () => {
    const indexes = await prisma.$queryRawUnsafe<{ indexname: string }[]>(
      `SELECT indexname FROM pg_indexes WHERE tablename = 'Product'`,
    );
    const names = indexes.map((r) => r.indexname).sort();
    expect(names).toEqual(
      expect.arrayContaining([
        'Product_fileHash_key',
        'Product_categoria_idx',
        'Product_riesgo_idx',
        'Product_createdAt_idx',
      ]),
    );
  });
});

describe('Product — filtros usados por el catálogo (E04 §5.1)', () => {
  beforeEach(async () => {
    await prisma.product.createMany({
      data: [
        makeProduct({ fileHash: 'f1', categoria: 'galletitas', riesgo: 'alto' }),
        makeProduct({ fileHash: 'f2', categoria: 'galletitas', riesgo: 'medio' }),
        makeProduct({ fileHash: 'f3', categoria: 'bebidas', riesgo: 'bajo' }),
      ],
    });
  });

  it('filters by categoria', async () => {
    const r = await prisma.product.findMany({ where: { categoria: 'galletitas' } });
    expect(r).toHaveLength(2);
  });

  it('filters by riesgo', async () => {
    const r = await prisma.product.findMany({ where: { riesgo: 'alto' } });
    expect(r).toHaveLength(1);
    expect(r[0]?.categoria).toBe('galletitas');
  });

  it('combines categoria + riesgo filters', async () => {
    const r = await prisma.product.findMany({
      where: { categoria: 'galletitas', riesgo: 'medio' },
    });
    expect(r).toHaveLength(1);
  });

  it('orders by createdAt desc (default sort of the catálogo endpoint)', async () => {
    const r = await prisma.product.findMany({ orderBy: { createdAt: 'desc' } });
    expect(r).toHaveLength(3);
    for (let i = 0; i < r.length - 1; i++) {
      expect(r[i]!.createdAt.getTime()).toBeGreaterThanOrEqual(r[i + 1]!.createdAt.getTime());
    }
  });
});
