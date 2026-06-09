/**
 * Step `enrich_with_off` — completa campos faltantes de la extracción
 * usando Open Food Facts (búsqueda por nombre).
 *
 * Posición: después de `validate_schema`, antes de `apply_rules`. La
 * razón: necesitamos un `ctx.product` válido, y queremos que las reglas
 * locales operen sobre los ingredientes/alérgenos enriquecidos.
 *
 * Opt-out: la env var `OFF_ENABLED=false` desactiva el step (lo dejamos
 * encendido por default; el fallo de red de OFF NO rompe el pipeline,
 * se loguea como `enrich.skipped` y se sigue).
 *
 * Política de merge (ver `merge-off.ts`):
 *   - LLM gana donde ya tiene data.
 *   - OFF rellena ingredientes/alérgenos vacíos.
 *   - apto/riesgo/confidence NO se tocan acá.
 */
import { logger } from '@/lib/logger';
import type { AnalysisContext } from '@/lib/pipeline/context';
import { makeTrace } from '@/lib/pipeline/trace';
import { searchOpenFoodFacts } from '@/lib/enrichment/off-client';
import { mergeOffIntoExtraction } from '@/lib/enrichment/merge-off';

export interface EnrichDeps {
  /** Inyectable para tests — devuelve `null` o un `OffMatch` mockeado. */
  search?: typeof searchOpenFoodFacts;
}

export async function enrich_with_off(
  ctx: AnalysisContext,
  deps: EnrichDeps = {},
): Promise<AnalysisContext> {
  const startedAt = new Date();
  if (!ctx.product) {
    throw new Error('enrich_with_off: ctx.product missing (call validate_schema first)');
  }

  if (process.env.OFF_ENABLED === 'false') {
    return {
      ...ctx,
      steps: [
        ...ctx.steps,
        makeTrace('enrich_with_off', 'skipped', startedAt, { reason: 'disabled_by_env' }),
      ],
    };
  }

  const search = deps.search ?? searchOpenFoodFacts;

  // Sólo invocamos OFF cuando la extracción tiene huecos — si el LLM ya
  // pescó ingredientes y alérgenos, ahorramos la request.
  const needsEnrichment =
    ctx.product.ingredientes_detectados.length === 0 || ctx.product.alergenos.length === 0;
  if (!needsEnrichment) {
    return {
      ...ctx,
      steps: [
        ...ctx.steps,
        makeTrace('enrich_with_off', 'skipped', startedAt, {
          reason: 'extraction_complete',
        }),
      ],
    };
  }

  try {
    const off = await search(ctx.product.producto);
    if (!off) {
      return {
        ...ctx,
        steps: [
          ...ctx.steps,
          makeTrace('enrich_with_off', 'skipped', startedAt, { reason: 'no_match' }),
        ],
      };
    }

    const { product, filledFromOff } = mergeOffIntoExtraction(ctx.product, off);
    logger.info('enrich.applied', {
      requestId: ctx.requestId,
      offCode: off.code,
      filledFromOff,
    });

    return {
      ...ctx,
      product,
      steps: [
        ...ctx.steps,
        makeTrace('enrich_with_off', 'ok', startedAt, {
          offCode: off.code,
          filledFromOff,
        }),
      ],
    };
  } catch (err) {
    // OFF caído no debe romper el análisis — logueamos como warn y seguimos.
    logger.warn('enrich.failed', {
      requestId: ctx.requestId,
      message: err instanceof Error ? err.message : 'unknown',
    });
    return {
      ...ctx,
      steps: [
        ...ctx.steps,
        makeTrace('enrich_with_off', 'skipped', startedAt, { reason: 'error' }),
      ],
    };
  }
}
