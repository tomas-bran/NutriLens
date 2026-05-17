/**
 * Step `compute_risk` — overrides product.riesgo with our deterministic
 * calculation. The model-reported value is preserved in extractionRaw.
 * Spec E03 §4.
 */
import { compute_risk as runRisk } from '@/lib/rules/risk';
import { logger } from '@/lib/logger';
import type { AnalysisContext } from '@/lib/pipeline/context';
import { makeTrace } from '@/lib/pipeline/trace';

export async function compute_risk(ctx: AnalysisContext): Promise<AnalysisContext> {
  const startedAt = new Date();
  if (!ctx.product) {
    throw new Error('compute_risk: ctx.product missing (call validate_schema first)');
  }
  if (!ctx.rules) {
    throw new Error('compute_risk: ctx.rules missing (call apply_rules first)');
  }

  const riesgo = runRisk(ctx.product, ctx.rules);

  logger.info('risk.computed', {
    requestId: ctx.requestId,
    riesgo,
    sellos: ctx.product.sellos.length,
    alergenos: ctx.product.alergenos.length,
  });

  return {
    ...ctx,
    product: { ...ctx.product, riesgo },
    steps: [
      ...ctx.steps,
      makeTrace('compute_risk', 'ok', startedAt, {
        riesgo,
        sellos: ctx.product.sellos.length,
        alergenos: ctx.product.alergenos.length,
      }),
    ],
  };
}
