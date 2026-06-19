/**
 * @vitest-environment node
 *
 * Integration tests for GET /api/products — paginated + filtered list (US-23 + US-24).
 * Seeds via Prisma directly so we don't pay the IA round trip per test row.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaClient, type Prisma } from '@prisma/client';

const { getUserIdMock } = vi.hoisted(() => ({ getUserIdMock: vi.fn() }));
vi.mock('@/lib/auth/current-user', () => ({
  getUserId: getUserIdMock,
}));

import { GET } from '@/app/api/products/route';

const prisma = new PrismaClient();

function seedRow(overrides: Partial<Prisma.ProductCreateInput> = {}): Prisma.ProductCreateInput {
  return {
    fileHash: `h-${Math.random().toString(36).slice(2)}-${Date.now()}-${Math.random()}`,
    nombre: 'Seed Product',
    categoria: 'galletitas',
    ingredientes: JSON.stringify(['harina']),
    alergenos: JSON.stringify(['gluten']),
    sellos: JSON.stringify(['exceso en azúcares']),
    aptoVegano: false,
    aptoCeliaco: false,
    aptoSinLactosa: true,
    riesgo: 'alto',
    confidence: 0.9,
    reglasAplicadas: JSON.stringify(['contiene_gluten']),
    explanation: null,
    jsonRaw: '{}',
    pipelineTrace: '[]',
    imagenPath: '/uploads/seed.jpg',
    promptVersion: 'extract_product-v1',
    ...overrides,
  };
}

async function bulkSeed(rows: Partial<Prisma.ProductCreateInput>[]) {
  await prisma.product.createMany({ data: rows.map((r) => seedRow(r)) });
}

function getRequest(query: string): Request {
  return new Request(`http://localhost/api/products${query}`, { method: 'GET' });
}

beforeEach(() => {
  getUserIdMock.mockReset();
  getUserIdMock.mockResolvedValue(null);
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await prisma.product.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /api/products — listado básico (US-23 Escenario 1+3)', () => {
  it('returns empty list with totalPages=0 when DB is empty', async () => {
    const res = await GET(getRequest('') as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    });
  });

  it('returns only the trimmed list shape (no jsonRaw, no pipelineTrace, no ingredientes, no explanation)', async () => {
    await bulkSeed([{ nombre: 'Test 1' }]);
    const res = await GET(getRequest('') as never);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    const item = body.items[0];
    expect(item).not.toHaveProperty('jsonRaw');
    expect(item).not.toHaveProperty('pipelineTrace');
    expect(item).not.toHaveProperty('ingredientes');
    expect(item).not.toHaveProperty('explanation');
    expect(item).toMatchObject({
      nombre: 'Test 1',
      categoria: 'galletitas',
      riesgo: 'alto',
      alergenos: ['gluten'],
      sellos: ['exceso en azúcares'],
      aptoVegano: false,
      aptoCeliaco: false,
      aptoSinLactosa: true,
      imagenUrl: '/uploads/seed.jpg',
    });
  });

  it('orders by createdAt desc by default', async () => {
    await prisma.product.create({
      data: seedRow({ nombre: 'Older', createdAt: new Date('2026-01-01') }),
    });
    await prisma.product.create({
      data: seedRow({ nombre: 'Newer', createdAt: new Date('2026-05-01') }),
    });
    const res = await GET(getRequest('') as never);
    const body = await res.json();
    expect(body.items.map((i: { nombre: string }) => i.nombre)).toEqual(['Newer', 'Older']);
  });

  it('orders by nombre asc when sort=nombre:asc', async () => {
    await bulkSeed([{ nombre: 'Zebra' }, { nombre: 'Apple' }, { nombre: 'Mango' }]);
    const res = await GET(getRequest('?sort=nombre:asc') as never);
    const body = await res.json();
    expect(body.items.map((i: { nombre: string }) => i.nombre)).toEqual([
      'Apple',
      'Mango',
      'Zebra',
    ]);
  });
});

describe('GET /api/products — pagination (US-23 Escenario 2)', () => {
  it('returns page=2 pageSize=10 with 25 products → totalPages=3 (user request scenario)', async () => {
    await bulkSeed(
      Array.from({ length: 25 }, (_, i) => ({ nombre: `Item ${String(i).padStart(2, '0')}` })),
    );
    const res = await GET(getRequest('?page=2&pageSize=10&sort=nombre:asc') as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      page: 2,
      pageSize: 10,
      total: 25,
      totalPages: 3,
    });
    expect(body.items).toHaveLength(10);
    // page 2 with pageSize 10 sorted asc → Item 10..19
    expect(body.items[0].nombre).toBe('Item 10');
    expect(body.items[9].nombre).toBe('Item 19');
  });

  it('returns the partial last page', async () => {
    await bulkSeed(Array.from({ length: 25 }, (_, i) => ({ nombre: `P ${i}` })));
    const res = await GET(getRequest('?page=3&pageSize=10') as never);
    const body = await res.json();
    expect(body.items).toHaveLength(5);
    expect(body.totalPages).toBe(3);
  });
});

describe('GET /api/products — filters (US-24 / spec §5.1)', () => {
  beforeEach(async () => {
    await bulkSeed([
      {
        nombre: 'Galletitas Choco',
        categoria: 'galletitas',
        riesgo: 'alto',
        alergenos: JSON.stringify(['gluten', 'leche']),
        aptoVegano: false,
        aptoCeliaco: false,
        aptoSinLactosa: false,
      },
      {
        nombre: 'Cereal Sin TACC',
        categoria: 'sin_tacc',
        riesgo: 'bajo',
        alergenos: JSON.stringify([]),
        aptoVegano: true,
        aptoCeliaco: true,
        aptoSinLactosa: true,
      },
      {
        nombre: 'Gaseosa Cola',
        categoria: 'bebidas',
        riesgo: 'alto',
        alergenos: JSON.stringify([]),
        aptoVegano: true,
        aptoCeliaco: true,
        aptoSinLactosa: true,
      },
      {
        nombre: 'Yogur Natural',
        categoria: 'lacteos',
        riesgo: 'medio',
        alergenos: JSON.stringify(['leche']),
        aptoVegano: false,
        aptoCeliaco: true,
        aptoSinLactosa: false,
      },
    ]);
  });

  it('filters by categoria (translates Zod → Prisma enum)', async () => {
    const res = await GET(getRequest('?categoria=lácteos') as never);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].nombre).toBe('Yogur Natural');
    expect(body.items[0].categoria).toBe('lácteos');
  });

  it('filters by riesgo', async () => {
    const res = await GET(getRequest('?riesgo=alto') as never);
    const body = await res.json();
    expect(body.total).toBe(2);
    expect(body.items.map((i: { nombre: string }) => i.nombre).sort()).toEqual(
      ['Galletitas Choco', 'Gaseosa Cola'].sort(),
    );
  });

  it('filters by alergeno (substring match on the JSON column)', async () => {
    const res = await GET(getRequest('?alergeno=leche') as never);
    const body = await res.json();
    expect(body.total).toBe(2);
    expect(body.items.map((i: { nombre: string }) => i.nombre).sort()).toEqual(
      ['Galletitas Choco', 'Yogur Natural'].sort(),
    );
  });

  it.each<[string, string[]]>([
    ['apto=vegano', ['Cereal Sin TACC', 'Gaseosa Cola']],
    ['apto=celiaco', ['Cereal Sin TACC', 'Gaseosa Cola', 'Yogur Natural']],
    ['apto=sin_lactosa', ['Cereal Sin TACC', 'Gaseosa Cola']],
  ])('filters by %s', async (filter, expected) => {
    const res = await GET(getRequest(`?${filter}`) as never);
    const body = await res.json();
    expect(body.items.map((i: { nombre: string }) => i.nombre).sort()).toEqual(expected.sort());
  });

  it('filters by q (case-insensitive substring on nombre)', async () => {
    const res = await GET(getRequest('?q=COLA') as never);
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.items[0].nombre).toBe('Gaseosa Cola');
  });

  it('combines filters with AND: categoria=galletitas AND riesgo=alto', async () => {
    const res = await GET(getRequest('?categoria=galletitas&riesgo=alto') as never);
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.items[0].nombre).toBe('Galletitas Choco');
  });

  it('combines filters with AND: riesgo=alto AND alergeno=leche', async () => {
    const res = await GET(getRequest('?riesgo=alto&alergeno=leche') as never);
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.items[0].nombre).toBe('Galletitas Choco');
  });

  it('combines filters with AND: apto=vegano AND riesgo=alto', async () => {
    const res = await GET(getRequest('?apto=vegano&riesgo=alto') as never);
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.items[0].nombre).toBe('Gaseosa Cola');
  });
});

describe('GET /api/products — invalid_query (spec §11 casos borde)', () => {
  it.each<[string, string]>([
    ['categoria desconocida', '?categoria=invented'],
    ['riesgo desconocido', '?riesgo=critico'],
    ['alergeno fuera del enum', '?alergeno=tofu'],
    ['apto desconocido', '?apto=paleo'],
    ['page no numérico', '?page=abc'],
    ['pageSize > 50', '?pageSize=100'],
    ['pageSize=0', '?pageSize=0'],
    ['sort desconocido', '?sort=random:asc'],
  ])('400 invalid_query for %s', async (_label, query) => {
    const res = await GET(getRequest(query) as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_query');
  });
});
