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
import { prisma } from '@/lib/db';
import { mapCategoriaToPrisma } from '@/lib/products/serializers';
import { rankByRiskAndSellos } from '@/lib/chat/rank';
import type { ChatIntent } from '@/lib/chat/intent-schema';

export const RETRIEVE_TOP_K = 5;
const RANKING_FETCH_LIMIT = 30;

export interface RetrieveDeps {
  /** Inyectable para tests (acepta un cliente Prisma stub). */
  db?: Pick<typeof prisma, 'product'>;
  topK?: number;
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

  if (!needsRanking) return rows;
  return rankByRiskAndSellos(rows).slice(0, topK);
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
