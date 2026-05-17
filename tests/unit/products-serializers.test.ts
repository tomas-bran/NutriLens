import { describe, expect, it } from 'vitest';
import type { Categoria as PrismaCategoria, Product as PrismaProduct } from '@prisma/client';
import { CATEGORIAS, type Categoria } from '@schemas/product';
import {
  mapCategoriaFromPrisma,
  mapCategoriaToPrisma,
  toDetail,
  toListItem,
} from '@/lib/products/serializers';

const PRISMA_VALUES: PrismaCategoria[] = [
  'galletitas',
  'cereales',
  'snacks',
  'lacteos',
  'bebidas',
  'sin_tacc',
  'veganos',
  'otros',
];

describe('mapCategoriaToPrisma / mapCategoriaFromPrisma', () => {
  it.each<[Categoria, PrismaCategoria]>([
    ['galletitas', 'galletitas'],
    ['cereales', 'cereales'],
    ['snacks', 'snacks'],
    ['lácteos', 'lacteos'],
    ['bebidas', 'bebidas'],
    ['sin TACC', 'sin_tacc'],
    ['veganos', 'veganos'],
    ['otros', 'otros'],
  ])('maps Zod %j → Prisma %j', (zod, prisma) => {
    expect(mapCategoriaToPrisma(zod)).toBe(prisma);
  });

  it.each<[PrismaCategoria, Categoria]>([
    ['galletitas', 'galletitas'],
    ['lacteos', 'lácteos'],
    ['sin_tacc', 'sin TACC'],
    ['otros', 'otros'],
  ])('maps Prisma %j → Zod %j', (prisma, zod) => {
    expect(mapCategoriaFromPrisma(prisma)).toBe(zod);
  });

  it('covers all 8 Zod categories', () => {
    for (const c of CATEGORIAS) {
      expect(() => mapCategoriaToPrisma(c)).not.toThrow();
    }
  });

  it('covers all 8 Prisma categories', () => {
    for (const c of PRISMA_VALUES) {
      expect(() => mapCategoriaFromPrisma(c)).not.toThrow();
    }
  });

  it('roundtrips Zod ↔ Prisma for every value', () => {
    for (const c of CATEGORIAS) {
      expect(mapCategoriaFromPrisma(mapCategoriaToPrisma(c))).toBe(c);
    }
  });
});

function makeRow(overrides: Partial<PrismaProduct> = {}): PrismaProduct {
  return {
    id: 'id-123',
    fileHash: 'hash-abc',
    nombre: 'Galletitas Test',
    categoria: 'galletitas' as PrismaCategoria,
    ingredientes: JSON.stringify(['harina de trigo', 'azúcar']),
    alergenos: JSON.stringify(['gluten']),
    sellos: JSON.stringify(['exceso en azúcares']),
    aptoVegano: false,
    aptoCeliaco: false,
    aptoSinLactosa: true,
    riesgo: 'alto',
    confidence: 0.91,
    reglasAplicadas: JSON.stringify(['contiene_gluten']),
    explanation: 'Producto con gluten.',
    jsonRaw: '{"raw":"json"}',
    pipelineTrace: JSON.stringify([{ name: 'validate_file', status: 'ok' }]),
    imagenPath: '/uploads/abc.jpg',
    promptVersion: 'extract_product-v1',
    createdAt: new Date('2026-05-16T14:32:11.000Z'),
    ...overrides,
  };
}

describe('toListItem (spec §5.1 trimmed shape)', () => {
  it('returns only the list fields — no jsonRaw, pipelineTrace, ingredientes, explanation', () => {
    const item = toListItem(makeRow());
    expect(item).toEqual({
      id: 'id-123',
      nombre: 'Galletitas Test',
      categoria: 'galletitas',
      riesgo: 'alto',
      alergenos: ['gluten'],
      sellos: ['exceso en azúcares'],
      aptoVegano: false,
      aptoCeliaco: false,
      aptoSinLactosa: true,
      imagenUrl: '/uploads/abc.jpg',
      createdAt: '2026-05-16T14:32:11.000Z',
    });
    // Negative assertions matter for the payload-size guarantee.
    expect(item).not.toHaveProperty('ingredientes');
    expect(item).not.toHaveProperty('jsonRaw');
    expect(item).not.toHaveProperty('pipelineTrace');
    expect(item).not.toHaveProperty('explanation');
  });

  it('translates lacteos → lácteos and sin_tacc → "sin TACC" on output', () => {
    expect(toListItem(makeRow({ categoria: 'lacteos' as PrismaCategoria })).categoria).toBe(
      'lácteos',
    );
    expect(toListItem(makeRow({ categoria: 'sin_tacc' as PrismaCategoria })).categoria).toBe(
      'sin TACC',
    );
  });

  it('returns [] for invalid JSON in array columns (defensive)', () => {
    const item = toListItem(makeRow({ alergenos: 'not json', sellos: 'also not' }));
    expect(item.alergenos).toEqual([]);
    expect(item.sellos).toEqual([]);
  });
});

describe('toDetail (spec §5.2 full shape)', () => {
  it('extends the list shape with ingredientes, jsonRaw, pipelineTrace, explanation, etc.', () => {
    const d = toDetail(makeRow());
    expect(d).toMatchObject({
      id: 'id-123',
      ingredientes: ['harina de trigo', 'azúcar'],
      confidence: 0.91,
      reglasAplicadas: ['contiene_gluten'],
      explanation: 'Producto con gluten.',
      jsonRaw: '{"raw":"json"}',
      pipelineTrace: [{ name: 'validate_file', status: 'ok' }],
      promptVersion: 'extract_product-v1',
    });
  });

  it('preserves null explanation when the model failed to generate one', () => {
    const d = toDetail(makeRow({ explanation: null }));
    expect(d.explanation).toBeNull();
  });

  it('returns [] for pipelineTrace when the column has invalid JSON', () => {
    const d = toDetail(makeRow({ pipelineTrace: 'corrupt' }));
    expect(d.pipelineTrace).toEqual([]);
  });
});
