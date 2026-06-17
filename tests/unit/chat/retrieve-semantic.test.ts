/**
 * Tests del retrieve híbrido (NL-402): el filtro estructurado manda; la
 * semántica solo completa el cupo faltante y nunca rompe el flujo.
 */
import { describe, expect, it, vi } from 'vitest';
import type { Product as PrismaProduct } from '@prisma/client';
import type { IaProvider } from '@/lib/ai/types';
import { retrieveProducts } from '@/lib/chat/retrieve';
import type { ChatIntent } from '@/lib/chat/intent-schema';

const INTENT: ChatIntent = {
  kind: 'info',
  categoria: null,
  riesgo_max: null,
  apto: null,
  alergeno_excluido: null,
  keywords: ['merienda dulce'],
  comparar: [],
};

const row = (id: string) => ({ id, nombre: id, createdAt: new Date() }) as PrismaProduct;

function makeDeps(structured: PrismaProduct[], semantic: PrismaProduct[]) {
  const db = {
    product: { findMany: vi.fn().mockResolvedValue(structured) },
  } as never;
  const semanticSearch = vi.fn().mockResolvedValue(semantic);
  const ia = { embed: vi.fn() } as unknown as IaProvider;
  return { db, semanticSearch, ia };
}

describe('retrieveProducts — híbrido (NL-402)', () => {
  it('si lo estructurado llena el topK, NO llama a la semántica', async () => {
    const structured = [row('a'), row('b'), row('c'), row('d'), row('e')];
    const { db, semanticSearch, ia } = makeDeps(structured, []);

    const result = await retrieveProducts(INTENT, {
      db,
      ia,
      question: '¿qué meriendo?',
      semanticSearch,
    });

    expect(result).toHaveLength(5);
    expect(semanticSearch).not.toHaveBeenCalled();
  });

  it('completa el cupo con semántica excluyendo los ya traídos', async () => {
    const structured = [row('a'), row('b')];
    const semantic = [row('s1'), row('s2')];
    const { db, semanticSearch, ia } = makeDeps(structured, semantic);

    const result = await retrieveProducts(INTENT, {
      db,
      ia,
      question: 'algo dulce para la merienda',
      semanticSearch,
    });

    expect(result.map((r) => r.id)).toEqual(['a', 'b', 's1', 's2']);
    const [text, opts] = semanticSearch.mock.calls[0] as [
      string,
      { k: number; excludeIds: string[] },
    ];
    expect(text).toBe('algo dulce para la merienda');
    expect(opts.k).toBe(3); // topK(5) - 2 estructurados
    expect(opts.excludeIds).toEqual(['a', 'b']);
  });

  it('sin ia/question se comporta como el retrieve clásico', async () => {
    const { db, semanticSearch } = makeDeps([row('a')], [row('s1')]);
    const result = await retrieveProducts(INTENT, { db, semanticSearch });
    expect(result.map((r) => r.id)).toEqual(['a']);
    expect(semanticSearch).not.toHaveBeenCalled();
  });

  it('kind=unknown sigue cortocircuitando a [] sin tocar la semántica', async () => {
    const { db, semanticSearch, ia } = makeDeps([], [row('s1')]);
    const result = await retrieveProducts(
      { ...INTENT, kind: 'unknown' },
      { db, ia, question: 'hola', semanticSearch },
    );
    expect(result).toEqual([]);
    expect(semanticSearch).not.toHaveBeenCalled();
  });
});
