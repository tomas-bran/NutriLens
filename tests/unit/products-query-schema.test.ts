import { describe, expect, it } from 'vitest';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, ProductsQuerySchema } from '@/lib/products/query-schema';

describe('ProductsQuerySchema — happy path defaults', () => {
  it('returns defaults when no query params are supplied', () => {
    const r = ProductsQuerySchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).toMatchObject({
        page: 1,
        pageSize: DEFAULT_PAGE_SIZE,
        sort: 'createdAt:desc',
      });
      expect(r.data.categoria).toBeUndefined();
    }
  });

  it('accepts every spec-defined filter at once', () => {
    const r = ProductsQuerySchema.safeParse({
      categoria: 'galletitas',
      riesgo: 'alto',
      alergeno: 'gluten',
      apto: 'celiaco',
      q: '  oreo  ',
      page: '3',
      pageSize: '50',
      sort: 'nombre:asc',
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).toMatchObject({
        categoria: 'galletitas',
        riesgo: 'alto',
        alergeno: 'gluten',
        apto: 'celiaco',
        q: 'oreo',
        page: 3,
        pageSize: 50,
        sort: 'nombre:asc',
      });
    }
  });
});

describe('ProductsQuerySchema — invalid_query (spec §11 cases borde)', () => {
  it.each<[string, Record<string, string>]>([
    ['unknown categoria', { categoria: 'invented' }],
    ['unknown riesgo', { riesgo: 'critico' }],
    ['unknown alergeno', { alergeno: 'tofu' }],
    ['unknown apto', { apto: 'paleo' }],
    ['non-numeric page', { page: 'abc' }],
    ['page < 1', { page: '0' }],
    ['pageSize > 50', { pageSize: '999' }],
    ['pageSize < 1', { pageSize: '0' }],
    ['unknown sort', { sort: 'random:asc' }],
    ['empty q (whitespace only)', { q: '   ' }],
  ])('rejects %s', (_label, params) => {
    expect(ProductsQuerySchema.safeParse(params).success).toBe(false);
  });

  it('caps page-size at MAX_PAGE_SIZE (50)', () => {
    expect(MAX_PAGE_SIZE).toBe(50);
    expect(ProductsQuerySchema.safeParse({ pageSize: '51' }).success).toBe(false);
    expect(ProductsQuerySchema.safeParse({ pageSize: '50' }).success).toBe(true);
  });
});
