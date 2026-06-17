/**
 * Step `retrieve_products` del pipeline de chat — traduce el intent en un
 * `Prisma.ProductWhereInput` y devuelve hasta TOP-K productos del historial.
 *
 * Spec: `docs/specs/E05-chat-rag.md §5`. Notas vs. el snippet del spec:
 *
 *   1. La categoría del intent viene en español canónico (`lácteos`,
 *      `sin TACC`); Prisma usa el enum snake_case → mapeamos con
 *      `mapCategoriaToPrisma`.
 *   2. `alergenos`/`ingredientes` se persisten como JSON.stringify de un
 *      array, no como Postgres text[] — buscamos con `contains: '"<term>"'`
 *      (mismo patrón que usa `historial/page.tsx` y `GET /api/products`)
 *      para evitar falsos positivos tipo "leche" matcheando "sin leche".
 *   3. Cuando `intent.riesgo_max = 'bajo'`, traemos un set más amplio y
 *      aplicamos `rankByRiskAndSellos` para devolver los top-K "más sanos"
 *      (US-28 escenario 3).
 *   4. `kind = 'unknown'` cortocircuita a `[]` (no hay nada que recuperar).
 */
import type { Prisma, Product as PrismaProduct } from '@prisma/client';
import type { IaProvider } from '@/lib/ai/types';
import { prisma } from '@/lib/db';
import { mapCategoriaToPrisma } from '@/lib/products/serializers';
import { rankByRiskAndSellos } from '@/lib/chat/rank';
import { semanticSearchProducts } from '@/lib/rag/semantic-search';
import type { ChatIntent } from '@/lib/chat/intent-schema';

export const RETRIEVE_TOP_K = 5;
const RANKING_FETCH_LIMIT = 30;

export interface RetrieveDeps {
  /** Inyectable para tests (acepta un cliente Prisma stub). */
  db?: Pick<typeof prisma, 'product'>;
  topK?: number;
  /**
   * NL-402: retrieval híbrido. Con `ia` + `question`, cuando el filtro
   * estructurado trae menos de topK resultados, se completa con búsqueda
   * semántica (cosine sobre pgvector) usando la pregunta original.
   * Inyectable para tests; sin ia/question el retrieve es el clásico.
   */
  ia?: IaProvider;
  question?: string;
  semanticSearch?: typeof semanticSearchProducts;
}

export async function retrieveProducts(
  intent: ChatIntent,
  deps: RetrieveDeps = {},
): Promise<PrismaProduct[]> {
  const db = deps.db ?? prisma;
  const topK = deps.topK ?? RETRIEVE_TOP_K;

  if (intent.kind === 'unknown') return [];

  if (intent.kind === 'compare') {
    if (intent.comparar.length === 0) return [];
    return db.product.findMany({
      where: {
        OR: intent.comparar.map((n) => ({
          nombre: { contains: n, mode: 'insensitive' },
        })),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.max(topK, intent.comparar.length * 2),
    });
  }

  const where = buildWhere(intent);
  const needsRanking = intent.riesgo_max === 'bajo';

  const rows = await db.product.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: needsRanking ? RANKING_FETCH_LIMIT : topK,
  });

  const structured = needsRanking ? rankByRiskAndSellos(rows).slice(0, topK) : rows;

  // NL-402: si lo estructurado no llenó el cupo, completamos con semántica.
  // Cubre el caso típico: keywords que no matchean texto exacto ("algo dulce
  // para la merienda") pero sí viven cerca en el espacio de embeddings.
  if (structured.length >= topK || !deps.ia || !deps.question) return structured;

  const search = deps.semanticSearch ?? semanticSearchProducts;
  const fill = await search(deps.question, {
    ia: deps.ia,
    k: topK - structured.length,
    excludeIds: structured.map((p) => p.id),
  });
  return [...structured, ...fill];
}

/** Visible para tests; construye el `where` Prisma a partir del intent. */
export function buildWhere(intent: ChatIntent): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};
  const AND: Prisma.ProductWhereInput[] = [];

  if (intent.categoria) {
    where.categoria = mapCategoriaToPrisma(intent.categoria);
  }

  if (intent.riesgo_max === 'bajo') where.riesgo = 'bajo';
  else if (intent.riesgo_max === 'medio') where.riesgo = { in: ['bajo', 'medio'] };
  // 'alto' (o null) → sin filtro de riesgo (todos los niveles son aceptables).

  if (intent.apto === 'vegano') where.aptoVegano = true;
  if (intent.apto === 'celiaco') where.aptoCeliaco = true;
  if (intent.apto === 'sin_lactosa') where.aptoSinLactosa = true;

  if (intent.alergeno_excluido) {
    AND.push({
      NOT: { alergenos: { contains: `"${intent.alergeno_excluido.toLowerCase()}"` } },
    });
  }

  if (intent.keywords.length > 0) {
    const kwOr: Prisma.ProductWhereInput[] = [];
    for (const k of intent.keywords) {
      const t = k.toLowerCase();
      kwOr.push({ nombre: { contains: k, mode: 'insensitive' } });
      kwOr.push({ ingredientes: { contains: `"${t}"` } });
      kwOr.push({ alergenos: { contains: `"${t}"` } });
    }
    AND.push({ OR: kwOr });
  }

  if (AND.length > 0) where.AND = AND;
  return where;
}
