/**
 * enrich_with_off — pipeline step (NL-601).
 *
 * Queries Open Food Facts after extraction. Failure is non-blocking:
 * the analysis continues normally regardless of OFF availability.
 */
import { logger } from '@/lib/logger';
import { fetchByBarcode, fetchByName } from '@/lib/off/client';
import { buildEnrichment } from '@/lib/off/enrich';
import { makeTrace } from '../trace';
import type { AnalysisContext } from '../context';

export async function enrich_with_off(ctx: AnalysisContext): Promise<AnalysisContext> {
  const startedAt = new Date();

  if (!ctx.product) {
    return {
      ...ctx,
      steps: [
        ...ctx.steps,
        makeTrace('enrich_with_off', 'skipped', startedAt, { reason: 'no_product' }),
      ],
    };
  }

  try {
    const { product } = ctx;

    // Prefer barcode lookup (faster, more accurate); fall back to name search.
    const offProduct = product.barcode
      ? await fetchByBarcode(product.barcode)
      : await fetchByName(product.producto, undefined);

    const enrichment = buildEnrichment(
      {
        producto: product.producto,
        alergenos: product.alergenos,
        apto_vegano: product.apto_vegano,
        apto_celiaco: product.apto_celiaco,
      },
      offProduct,
    );

    logger.info('enrich_with_off', {
      requestId: ctx.requestId,
      matched: enrichment.matched,
      durationMs: Date.now() - startedAt.getTime(),
      confirmedFields: enrichment.confirmedFields,
      discrepanciesCount: enrichment.discrepancies.length,
    });

    // Apply confidence delta from enrichment
    const updatedProduct = enrichment.matched
      ? {
          ...product,
          confidence: Math.max(0, Math.min(1, product.confidence + enrichment.confidenceDelta)),
        }
      : product;

    return {
      ...ctx,
      product: updatedProduct,
      offEnrichment: enrichment,
      steps: [
        ...ctx.steps,
        makeTrace('enrich_with_off', 'ok', startedAt, {
          matched: enrichment.matched,
          confirmedFields: enrichment.confirmedFields,
        }),
      ],
    };
  } catch (err) {
    // Non-blocking: log and continue without enrichment
    logger.warn('enrich_with_off', { requestId: ctx.requestId, error: String(err) });
    return {
      ...ctx,
      offEnrichment: null,
      steps: [
        ...ctx.steps,
        makeTrace('enrich_with_off', 'skipped', startedAt, { reason: 'off_unavailable' }),
      ],
    };
  }
}
