/**
 * Health score for product ranking (NL-403).
 *
 * Scoring formula (documented):
 *   - riesgo: bajo=0pts, medio=-10pts, alto=-20pts   (main factor)
 *   - sellos: -3pts per sello (each one is a warning flag)
 *   - aptitudes: +2pts each for apto_vegano / apto_celiaco / apto_sin_lactosa
 *
 * Final score = base(100) + riesgo_delta + sellos_delta + aptitud_bonus
 * Range: [100 - 20 - 15 + 0, 100 + 0 - 0 + 6] = [65, 106]
 * Deterministic tiebreak: same score → more recent createdAt first (higher ms = first).
 */

export interface HealthScoreInput {
  riesgo: string;
  sellos: string; // JSON.stringify(string[])
  aptoVegano: boolean;
  aptoCeliaco: boolean;
  aptoSinLactosa: boolean;
  createdAt: Date;
}

export interface HealthScoreResult {
  score: number;
  breakdown: {
    riesgo: number;
    sellos: number;
    aptitudes: number;
  };
  justification: string;
}

const RIESGO_DELTA: Record<string, number> = {
  bajo: 0,
  medio: -10,
  alto: -20,
};

const SELLO_PENALTY = 3;
const APTITUD_BONUS = 2;
const BASE_SCORE = 100;

export function computeHealthScore(product: HealthScoreInput): HealthScoreResult {
  const riesgo_delta = RIESGO_DELTA[product.riesgo] ?? -20;

  let sellos_count = 0;
  try {
    const parsed = JSON.parse(product.sellos);
    sellos_count = Array.isArray(parsed) ? parsed.length : 0;
  } catch {}
  const sellos_delta = -sellos_count * SELLO_PENALTY;

  const aptitudes_count =
    (product.aptoVegano ? 1 : 0) + (product.aptoCeliaco ? 1 : 0) + (product.aptoSinLactosa ? 1 : 0);
  const aptitud_bonus = aptitudes_count * APTITUD_BONUS;

  const score = BASE_SCORE + riesgo_delta + sellos_delta + aptitud_bonus;

  const reasons: string[] = [];
  if (product.riesgo === 'bajo') reasons.push('riesgo bajo');
  else if (product.riesgo === 'medio') reasons.push('riesgo medio');
  else reasons.push('riesgo alto');

  if (sellos_count === 0) reasons.push('sin sellos de advertencia');
  else reasons.push(`${sellos_count} sello${sellos_count > 1 ? 's' : ''} de advertencia`);

  if (aptitudes_count > 0) {
    const apts = [
      product.aptoVegano && 'vegano',
      product.aptoCeliaco && 'apto celíacos',
      product.aptoSinLactosa && 'sin lactosa',
    ].filter(Boolean) as string[];
    reasons.push(apts.join(', '));
  }

  return {
    score,
    breakdown: { riesgo: riesgo_delta, sellos: sellos_delta, aptitudes: aptitud_bonus },
    justification: reasons.join(' · '),
  };
}

export function rankByHealthScore<T extends HealthScoreInput>(
  products: T[],
): Array<T & { healthScore: HealthScoreResult }> {
  return [...products]
    .map((p) => ({ ...p, healthScore: computeHealthScore(p) }))
    .sort((a, b) => {
      if (b.healthScore.score !== a.healthScore.score) {
        return b.healthScore.score - a.healthScore.score;
      }
      // Deterministic tiebreak: more recent first
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
}
