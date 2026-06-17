/**
 * Tests de semantic-search (NL-402/NL-405) con prisma mockeado.
 * Contratos clave: orden por distancia, threshold de relevancia, exclusión
 * de ids y fail-open ([] ante cualquier error).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IaProvider } from '@/lib/ai/types';

const mockQueryRaw = vi.hoisted(() => vi.fn());
const mockFindMany = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  prisma: {
    $queryRaw: mockQueryRaw,
    product: { findMany: mockFindMany },
  },
}));

import { findSimilarProducts, semanticSearchProducts } from '@/lib/rag/semantic-search';

function makeIa(vector: number[] | Error) {
  return {
    embed: vi.fn().mockImplementation(() => {
      if (vector instanceof Error) return Promise.reject(vector);
      return Promise.resolve({ vector, usage: { in: 1, out: 0 }, latencyMs: 1 });
    }),
  } as unknown as IaProvider;
}

const row = (id: string) => ({ id, nombre: `Producto ${id}` });

beforeEach(() => {
  mockQueryRaw.mockReset();
  mockFindMany.mockReset();
});

describe('semanticSearchProducts', () => {
  it('devuelve rows completas en orden de distancia', async () => {
    mockQueryRaw.mockResolvedValueOnce([
      { id: 'b', distance: 0.2 },
      { id: 'a', distance: 0.4 },
    ]);
    mockFindMany.mockResolvedValueOnce([row('a'), row('b')]);

    const result = await semanticSearchProducts('algo dulce', { ia: makeIa([1, 0, 0]), k: 5 });
    expect(result.map((r) => r.id)).toEqual(['b', 'a']);
  });

  it('filtra hits por encima del threshold de distancia', async () => {
    mockQueryRaw.mockResolvedValueOnce([
      { id: 'cerca', distance: 0.3 },
      { id: 'lejos', distance: 0.95 },
    ]);
    mockFindMany.mockResolvedValueOnce([row('cerca')]);

    const result = await semanticSearchProducts('q', { ia: makeIa([1]), k: 5 });
    expect(result.map((r) => r.id)).toEqual(['cerca']);
    // findMany solo se consulta por los relevantes
    expect(mockFindMany.mock.calls[0]![0].where.id.in).toEqual(['cerca']);
  });

  it('fail-open: si el embed falla devuelve [] sin propagar', async () => {
    const result = await semanticSearchProducts('q', {
      ia: makeIa(new Error('model_timeout')),
      k: 3,
    });
    expect(result).toEqual([]);
    expect(mockQueryRaw).not.toHaveBeenCalled();
  });

  it('fail-open: si la query SQL falla devuelve []', async () => {
    mockQueryRaw.mockRejectedValueOnce(new Error('column embedding does not exist'));
    const result = await semanticSearchProducts('q', { ia: makeIa([1]), k: 3 });
    expect(result).toEqual([]);
  });
});

describe('findSimilarProducts', () => {
  it('busca vecinos del embedding guardado excluyendo el propio id', async () => {
    mockQueryRaw
      .mockResolvedValueOnce([{ embedding: '[0.5,0.5]' }]) // SELECT del target
      .mockResolvedValueOnce([{ id: 'vecino', distance: 0.1 }]);
    mockFindMany.mockResolvedValueOnce([row('vecino')]);

    const result = await findSimilarProducts('yo', 4);
    expect(result.map((r) => r.id)).toEqual(['vecino']);
  });

  it('producto sin embedding (pre-backfill) → []', async () => {
    mockQueryRaw.mockResolvedValueOnce([{ embedding: null }]);
    expect(await findSimilarProducts('sin-embedding', 4)).toEqual([]);
  });

  it('producto inexistente → []', async () => {
    mockQueryRaw.mockResolvedValueOnce([]);
    expect(await findSimilarProducts('nope', 4)).toEqual([]);
  });
});
