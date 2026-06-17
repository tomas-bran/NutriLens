/**
 * Búsqueda semántica sobre el historial (NL-402) y productos similares
 * (NL-405). Cosine distance de pgvector (`<=>`): 0 = idéntico, 2 = opuesto.
 *
 * Diseño:
 *   - El ranking corre en SQL con el índice HNSW; acá solo entran/salen ids.
 *   - `MAX_DISTANCE` filtra matches irrelevantes: con text-embedding-3-small,
 *     pares producto/pregunta relacionados rondan 0.3-0.55; >0.7 es ruido.
 *   - Fail-open en los callers: cualquier error acá no debe romper ni el
 *     chat ni el detalle — devolver [] es siempre aceptable.
 */
import { Prisma, type Product as PrismaProduct } from '@prisma/client';
import { prisma } from '@/lib/db';
import type { IaProvider } from '@/lib/ai/types';
import { logger } from '@/lib/logger';
import { toVectorLiteral } from './vector';

const MAX_DISTANCE = 0.7;

interface SemanticHit {
  id: string;
  distance: number;
}

export interface SemanticSearchOpts {
  ia: IaProvider;
  k: number;
  /** Ids ya presentes (p.ej. los que trajo el filtro estructurado). */
  excludeIds?: string[];
}

/**
 * Top-K productos semánticamente más cercanos al texto dado.
 * Devuelve rows completas en orden de similitud. [] ante cualquier fallo.
 */
export async function semanticSearchProducts(
  text: string,
  { ia, k, excludeIds = [] }: SemanticSearchOpts,
): Promise<PrismaProduct[]> {
  try {
    const { vector } = await ia.embed(text);
    return await nearestByVector(vector, k, excludeIds);
  } catch (err) {
    logger.warn('rag.semantic_search_failed', {
      message: err instanceof Error ? err.message : 'unknown',
    });
    return [];
  }
}

/** Top-K más cercanos a un producto existente (por su embedding guardado). */
export async function findSimilarProducts(productId: string, k: number): Promise<PrismaProduct[]> {
  try {
    const target = await prisma.$queryRaw<Array<{ embedding: string | null }>>(
      Prisma.sql`SELECT "embedding"::text AS embedding FROM "Product" WHERE "id" = ${productId}`,
    );
    const literal = target[0]?.embedding;
    if (!literal) return [];
    const vector = JSON.parse(literal) as number[];
    return await nearestByVector(vector, k, [productId]);
  } catch (err) {
    logger.warn('rag.similar_failed', {
      productId,
      message: err instanceof Error ? err.message : 'unknown',
    });
    return [];
  }
}

async function nearestByVector(
  vector: number[],
  k: number,
  excludeIds: string[],
): Promise<PrismaProduct[]> {
  const literal = toVectorLiteral(vector);
  const exclusion =
    excludeIds.length > 0 ? Prisma.sql`AND "id" NOT IN (${Prisma.join(excludeIds)})` : Prisma.empty;

  const hits = await prisma.$queryRaw<SemanticHit[]>(
    Prisma.sql`
      SELECT "id", ("embedding" <=> ${literal}::vector)::float8 AS distance
      FROM "Product"
      WHERE "embedding" IS NOT NULL ${exclusion}
      ORDER BY distance ASC
      LIMIT ${k}
    `,
  );

  const relevant = hits.filter((h) => h.distance <= MAX_DISTANCE);
  if (relevant.length === 0) return [];

  const rows = await prisma.product.findMany({ where: { id: { in: relevant.map((h) => h.id) } } });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return relevant.map((h) => byId.get(h.id)).filter((r): r is PrismaProduct => Boolean(r));
}
