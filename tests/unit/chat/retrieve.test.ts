/**
 * Tests unit de `retrieveProducts` + `buildWhere`. Inyectamos un stub de
 * `db.product.findMany` para inspeccionar el `where`/`take`/`orderBy` que
 * sale al ORM, sin tocar Postgres.
 *
 * Spec: `docs/specs/E05-chat-rag.md §5 + §11`.
 */
import { describe, it, expect, vi } from 'vitest';
import type { Product as PrismaProduct } from '@prisma/client';
import {
  buildWhere,
  retrieveProducts,
  RETRIEVE_TOP_K,
  type RetrieveDeps,
} from '@/lib/chat/retrieve';
import type { ChatIntent } from '@/lib/chat/intent-schema';

const BASE_INTENT: ChatIntent = {
  kind: 'filter',
  categoria: null,
  riesgo_max: null,
  apto: null,
  alergeno_excluido: null,
  keywords: [],
  comparar: [],
};

function makeRow(overrides: Partial<PrismaProduct> = {}): PrismaProduct {
  const now = new Date('2025-04-01T12:00:00Z');
  return {
    id: overrides.id ?? 'r1',
    fileHash: overrides.fileHash ?? 'h1',
    nombre: overrides.nombre ?? 'X',
    categoria: overrides.categoria ?? 'galletitas',
    ingredientes: overrides.ingredientes ?? '[]',
    alergenos: overrides.alergenos ?? '[]',
    sellos: overrides.sellos ?? '[]',
    aptoVegano: overrides.aptoVegano ?? false,
    aptoCeliaco: overrides.aptoCeliaco ?? false,
    aptoSinLactosa: overrides.aptoSinLactosa ?? false,
    riesgo: overrides.riesgo ?? 'bajo',
    confidence: overrides.confidence ?? 0.9,
    reglasAplicadas: overrides.reglasAplicadas ?? '[]',
    explanation: overrides.explanation ?? null,
    jsonRaw: overrides.jsonRaw ?? '{}',
    pipelineTrace: overrides.pipelineTrace ?? '[]',
    imagenPath: overrides.imagenPath ?? '/uploads/x.jpg',
    imagenMime: 'image/jpeg',
    imagenBytes: 1024,
    promptVersion: overrides.promptVersion ?? 'extract_product-v1',
    createdAt: overrides.createdAt ?? now,
  };
}

function makeDb(rows: PrismaProduct[] = []) {
  const findMany = vi.fn().mockResolvedValue(rows);
  return {
    db: { product: { findMany } } as unknown as NonNullable<RetrieveDeps['db']>,
    findMany,
  };
}

describe('buildWhere — combinaciones de filtros (US-28 AC §1-§3)', () => {
  it('intent vacío → where = {}', () => {
    expect(buildWhere(BASE_INTENT)).toEqual({});
  });

  it('intent.categoria mapea al enum Prisma snake_case', () => {
    const w = buildWhere({ ...BASE_INTENT, categoria: 'lácteos' });
    expect(w.categoria).toBe('lacteos');
  });

  it('intent.categoria=sin TACC → sin_tacc en Prisma', () => {
    const w = buildWhere({ ...BASE_INTENT, categoria: 'sin TACC' });
    expect(w.categoria).toBe('sin_tacc');
  });

  it('apto=celiaco → aptoCeliaco=true (AC §1: galletitas aptas celíacos)', () => {
    const w = buildWhere({ ...BASE_INTENT, categoria: 'galletitas', apto: 'celiaco' });
    expect(w.categoria).toBe('galletitas');
    expect(w.aptoCeliaco).toBe(true);
  });

  it('apto=vegano → aptoVegano=true', () => {
    expect(buildWhere({ ...BASE_INTENT, apto: 'vegano' }).aptoVegano).toBe(true);
  });

  it('apto=sin_lactosa → aptoSinLactosa=true', () => {
    expect(buildWhere({ ...BASE_INTENT, apto: 'sin_lactosa' }).aptoSinLactosa).toBe(true);
  });

  it('riesgo_max=bajo → riesgo = "bajo"', () => {
    expect(buildWhere({ ...BASE_INTENT, riesgo_max: 'bajo' }).riesgo).toBe('bajo');
  });

  it('riesgo_max=medio → riesgo in ["bajo","medio"]', () => {
    expect(buildWhere({ ...BASE_INTENT, riesgo_max: 'medio' }).riesgo).toEqual({
      in: ['bajo', 'medio'],
    });
  });

  it('riesgo_max=alto → sin filtro de riesgo (todos los niveles aceptables)', () => {
    expect(buildWhere({ ...BASE_INTENT, riesgo_max: 'alto' }).riesgo).toBeUndefined();
  });

  it('alergeno_excluido → NOT { alergenos contains "<term>" } con quotes (AC §2 invertido)', () => {
    const w = buildWhere({ ...BASE_INTENT, alergeno_excluido: 'leche' });
    expect(w.AND).toEqual([{ NOT: { alergenos: { contains: '"leche"' } } }]);
  });

  it('keyword "leche" busca en nombre + ingredientes + alergenos (AC §2)', () => {
    const w = buildWhere({ ...BASE_INTENT, kind: 'info', keywords: ['leche'] });
    expect(w.AND).toEqual([
      {
        OR: [
          { nombre: { contains: 'leche', mode: 'insensitive' } },
          { ingredientes: { contains: '"leche"' } },
          { alergenos: { contains: '"leche"' } },
        ],
      },
    ]);
  });

  it('múltiples filtros combinan en categoria/apto/riesgo + AND[]', () => {
    const w = buildWhere({
      ...BASE_INTENT,
      categoria: 'galletitas',
      apto: 'celiaco',
      riesgo_max: 'bajo',
      keywords: ['choco'],
      alergeno_excluido: 'maní',
    });
    expect(w.categoria).toBe('galletitas');
    expect(w.aptoCeliaco).toBe(true);
    expect(w.riesgo).toBe('bajo');
    expect(w.AND).toHaveLength(2);
  });
});

describe('retrieveProducts — branching por kind', () => {
  it('kind=unknown corta a [] sin tocar la DB', async () => {
    const { db, findMany } = makeDb();
    const r = await retrieveProducts({ ...BASE_INTENT, kind: 'unknown' }, { db: db as never });
    expect(r).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('kind=compare con array vacío corta a [] sin tocar la DB', async () => {
    const { db, findMany } = makeDb();
    const r = await retrieveProducts({ ...BASE_INTENT, kind: 'compare' }, { db: db as never });
    expect(r).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('kind=compare con 2 nombres → OR de contains insensitive', async () => {
    const { db, findMany } = makeDb([makeRow({ id: 'a' }), makeRow({ id: 'b' })]);
    await retrieveProducts(
      { ...BASE_INTENT, kind: 'compare', comparar: ['Galletitas X', 'Galletitas Y'] },
      { db: db as never },
    );
    const call = findMany.mock.calls[0]![0];
    expect(call.where).toEqual({
      OR: [
        { nombre: { contains: 'Galletitas X', mode: 'insensitive' } },
        { nombre: { contains: 'Galletitas Y', mode: 'insensitive' } },
      ],
    });
  });

  it('kind=filter manda take=TOP_K y orderBy createdAt desc', async () => {
    const { db, findMany } = makeDb([]);
    await retrieveProducts(
      { ...BASE_INTENT, categoria: 'galletitas', apto: 'celiaco' },
      { db: db as never },
    );
    const call = findMany.mock.calls[0]![0];
    expect(call.take).toBe(RETRIEVE_TOP_K);
    expect(call.orderBy).toEqual({ createdAt: 'desc' });
  });
});

describe('retrieveProducts — ranking cuando riesgo_max=bajo (US-28 AC §3)', () => {
  it('aplica rankByRiskAndSellos y devuelve top-K después del orden', async () => {
    const rows: PrismaProduct[] = [
      makeRow({
        id: 'mal',
        riesgo: 'alto',
        sellos: JSON.stringify(['exceso en azúcares', 'exceso en sodio']),
      }),
      makeRow({ id: 'sano', riesgo: 'bajo', sellos: '[]' }),
      makeRow({ id: 'mediocre', riesgo: 'medio', sellos: '[]' }),
    ];
    const { db } = makeDb(rows);
    const r = await retrieveProducts(
      { ...BASE_INTENT, categoria: 'galletitas', riesgo_max: 'bajo' },
      { db: db as never, topK: 5 },
    );
    expect(r.map((x) => x.id)).toEqual(['sano', 'mediocre', 'mal']);
  });

  it('truca el resultado a topK luego del ranking', async () => {
    const rows: PrismaProduct[] = Array.from({ length: 10 }, (_, i) =>
      makeRow({ id: `p${i}`, riesgo: i % 3 === 0 ? 'bajo' : 'medio' }),
    );
    const { db } = makeDb(rows);
    const r = await retrieveProducts(
      { ...BASE_INTENT, riesgo_max: 'bajo' },
      { db: db as never, topK: 3 },
    );
    expect(r).toHaveLength(3);
  });
});

describe('retrieveProducts — sin productos relevantes (US-28 AC §4)', () => {
  it('DB sin matches → []', async () => {
    const { db } = makeDb([]);
    const r = await retrieveProducts(
      { ...BASE_INTENT, categoria: 'galletitas' },
      { db: db as never },
    );
    expect(r).toEqual([]);
  });
});
