/**
 * @vitest-environment node
 *
 * Integration tests for the seed dataset (US-38, E06 §8).
 *
 * Verifica que `seedDatabase()` deja la DB en el estado esperado:
 *   - 50 productos persistidos (count).
 *   - Cada una de las 8 categorías queda representada al menos una vez.
 *   - Cada nivel de riesgo (bajo/medio/alto) queda presente.
 *   - Idempotencia: correr seed dos veces no duplica ni rompe.
 *
 * Hits a real Postgres vía DATABASE_URL (lo mismo que el resto de
 * `tests/integration/`). En CI lo provee el service Postgres del workflow.
 */
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { type Categoria as PrismaCategoria, PrismaClient } from '@prisma/client';
import { SEED_PRODUCTS, SEED_PRODUCT_IDS, seedDatabase } from '../../prisma/seed';

const prisma = new PrismaClient();

const ALL_CATEGORIAS: ReadonlyArray<PrismaCategoria> = [
  'galletitas',
  'cereales',
  'snacks',
  'lacteos',
  'bebidas',
  'sin_tacc',
  'veganos',
  'otros',
];

beforeEach(async () => {
  await prisma.product.deleteMany();
});

afterAll(async () => {
  await prisma.product.deleteMany();
  await prisma.$disconnect();
});

describe('seedDatabase (US-38)', () => {
  it('inserts exactly 50 products', async () => {
    const inserted = await seedDatabase(prisma);
    expect(inserted).toBe(50);
    const count = await prisma.product.count();
    expect(count).toBe(50);
  });

  it('covers every categoria with at least one product', async () => {
    await seedDatabase(prisma);
    for (const categoria of ALL_CATEGORIAS) {
      const count = await prisma.product.count({ where: { categoria } });
      expect(count, `categoria=${categoria} debería tener al menos 1`).toBeGreaterThanOrEqual(1);
    }
  });

  it('represents the three risk levels', async () => {
    await seedDatabase(prisma);
    const [bajo, medio, alto] = await Promise.all([
      prisma.product.count({ where: { riesgo: 'bajo' } }),
      prisma.product.count({ where: { riesgo: 'medio' } }),
      prisma.product.count({ where: { riesgo: 'alto' } }),
    ]);
    expect(bajo).toBeGreaterThan(0);
    expect(medio).toBeGreaterThan(0);
    expect(alto).toBeGreaterThan(0);
    expect(bajo + medio + alto).toBe(50);
  });

  it('uses the hardcoded UUIDs from the dataset (stable for E2E)', async () => {
    await seedDatabase(prisma);
    const rows = await prisma.product.findMany({ select: { id: true } });
    const ids = new Set(rows.map((r) => r.id));
    for (const expected of SEED_PRODUCT_IDS) {
      expect(ids.has(expected), `falta id ${expected}`).toBe(true);
    }
  });

  it('persists realistic jsonRaw with all the model-output fields', async () => {
    await seedDatabase(prisma);
    const sample = await prisma.product.findUnique({ where: { id: SEED_PRODUCT_IDS[0] } });
    expect(sample).not.toBeNull();
    const parsed = JSON.parse(sample!.jsonRaw);
    expect(parsed).toMatchObject({
      producto: expect.any(String),
      categoria: expect.any(String),
      ingredientes_detectados: expect.any(Array),
      alergenos: expect.any(Array),
      sellos: expect.any(Array),
      apto_vegano: expect.any(Boolean),
      apto_celiaco: expect.any(Boolean),
      apto_sin_lactosa: expect.any(Boolean),
      riesgo: expect.stringMatching(/^(bajo|medio|alto)$/),
      confidence: expect.any(Number),
    });
  });

  it('is idempotent: running seedDatabase twice still leaves exactly 50 rows', async () => {
    await seedDatabase(prisma);
    await seedDatabase(prisma);
    expect(await prisma.product.count()).toBe(50);
  });

  it('points every product imagenPath at the committed seed images', async () => {
    await seedDatabase(prisma);
    const rows = await prisma.product.findMany({ select: { imagenPath: true } });
    for (const row of rows) {
      expect(row.imagenPath).toMatch(/^\/uploads\/seed\/[a-z-]+\.jpg$/);
    }
  });
});

describe('SEED_PRODUCTS — invariantes del dataset (sin DB)', () => {
  it('contains exactly 50 entries', () => {
    expect(SEED_PRODUCTS).toHaveLength(50);
  });

  it('every id is unique', () => {
    const ids = new Set(SEED_PRODUCTS.map((p) => p.id));
    expect(ids.size).toBe(50);
  });

  it('covers all 8 categorías', () => {
    const categorias = new Set(SEED_PRODUCTS.map((p) => p.categoria));
    expect(categorias.size).toBe(ALL_CATEGORIAS.length);
  });
});
