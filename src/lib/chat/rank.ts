/**
 * Ranking de productos para el caso `riesgo_max=bajo` (US-28 escenario 3:
 * "mejor perfil nutricional"). Spec: `E05 §5.1`.
 *
 * Orden:
 *   1. Menor riesgo primero (bajo < medio < alto).
 *   2. A igualdad de riesgo, menos sellos primero.
 *   3. A igualdad de sellos, más reciente primero (createdAt desc).
 *
 * `createdAt` ya viene desempatado por el query (orderBy desc), pero el sort
 * estable lo preserva — igualmente mantenemos el tiebreaker explícito para
 * que sea testeable en aislamiento.
 */
import type { Product as PrismaProduct } from '@prisma/client';

export const RISK_SCORE: Record<string, number> = {
  bajo: 0,
  medio: 1,
  alto: 2,
};

export function rankByRiskAndSellos<
  T extends Pick<PrismaProduct, 'riesgo' | 'sellos' | 'createdAt'>,
>(products: T[]): T[] {
  return [...products].sort((a, b) => {
    const ra = RISK_SCORE[a.riesgo] ?? 99;
    const rb = RISK_SCORE[b.riesgo] ?? 99;
    if (ra !== rb) return ra - rb;

    const sa = countSellos(a.sellos);
    const sb = countSellos(b.sellos);
    if (sa !== sb) return sa - sb;

    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

function countSellos(raw: string): number {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}
