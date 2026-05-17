/**
 * Step `apply_rules` — pure wrapper around the rules engine + trace + log.
 * Spec E03 §3. Overrides the model-reported apto_* flags with our own
 * deterministic ones; the raw model values stay in ctx.extractionRaw for audit.
 */
import { apply_rules as runRules } from '@/lib/rules/apply';
import { logger } from '@/lib/logger';
import type { AnalysisContext } from '@/lib/pipeline/context';
import { makeTrace } from '@/lib/pipeline/trace';

export async function apply_rules(ctx: AnalysisContext): Promise<AnalysisContext> {
  const startedAt = new Date();
  if (!ctx.product) {
    throw new Error('apply_rules: ctx.product missing (call validate_schema first)');
  }

  const rules = runRules(ctx.product);

  // Detect divergence vs the model's own apto_* flags so we can spot drift
  // (spec §10 "Modelo devuelve aptitudes correctas pero contradice nuestras reglas").
  const divergedFromModel =
    ctx.product.apto_vegano !== rules.apto_vegano ||
    ctx.product.apto_celiaco !== rules.apto_celiaco ||
    ctx.product.apto_sin_lactosa !== rules.apto_sin_lactosa;

  logger.info('rules.applied', {
    requestId: ctx.requestId,
    reglas_aplicadas: rules.reglas_aplicadas,
    divergedFromModel,
  });

  const overriddenProduct = {
    ...ctx.product,
    apto_vegano: rules.apto_vegano,
    apto_celiaco: rules.apto_celiaco,
    apto_sin_lactosa: rules.apto_sin_lactosa,
  };

  return {
    ...ctx,
    product: overriddenProduct,
    rules,
    steps: [
      ...ctx.steps,
      makeTrace('apply_rules', 'ok', startedAt, {
        reglas_aplicadas: rules.reglas_aplicadas,
        divergedFromModel,
      }),
    ],
  };
}
