/**
 * enrich_with_off — pipeline step (NL-601).
 *
 * Queries Open Food Facts after extraction. Failure is non-blocking:
 * the analysis continues normally regardless of OFF availability.
 */
import { logger } from '@/lib/logger';
import { fetchByBarcode, fetchByName } from '@/lib/off/client';
import { buildEnrichment } from '@/lib/off/enrich';
import { decodeBarcode } from '@/lib/off/decode-barcode';
import { makeTrace } from '../trace';
import type { AnalysisContext } from '../context';

export async function enrich_with_off(ctx: AnalysisContext): Promise<AnalysisContext> {
  const startedAt = new Date();

  // Kill-switch: OFF_ENABLED=false apaga el enriquecimiento por completo
  // (tests de integración y CI no deben depender de la API real de OFF).
  // Se lee en cada llamada — no a nivel módulo — para que los tests puedan
  // setearlo en beforeAll sin depender del orden de imports.
  if (process.env.OFF_ENABLED === 'false') {
    return {
      ...ctx,
      offEnrichment: null,
      steps: [
        ...ctx.steps,
        makeTrace('enrich_with_off', 'skipped', startedAt, { reason: 'disabled' }),
      ],
    };
  }

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

    // Resolución del código de barras, de más a menos confiable (NL-601):
    //   1. imagen dedicada del código (si el usuario la subió) — decodificada,
    //   2. la foto principal del producto — decodificada con zxing,
    //   3. el que "leyó" el LLM (suele venir mal),
    //   4. sin código → búsqueda por nombre.
    let barcode: string | null = null;
    let barcodeSource: 'barcode-image' | 'photo' | 'extracted' | 'none' = 'none';

    if (ctx.barcodeImage) {
      const fromImage = await decodeBarcode(ctx.barcodeImage.buffer, ctx.barcodeImage.mime);
      if (fromImage) {
        barcode = fromImage;
        barcodeSource = 'barcode-image';
      }
    }
    if (!barcode) {
      const fromPhoto = await decodeBarcode(ctx.file.buffer, ctx.file.mime);
      if (fromPhoto) {
        barcode = fromPhoto;
        barcodeSource = 'photo';
      }
    }
    if (!barcode && product.barcode) {
      barcode = product.barcode;
      barcodeSource = 'extracted';
    }

    // Prefer barcode lookup (faster, more accurate); fall back to name search.
    const offProduct = barcode
      ? await fetchByBarcode(barcode)
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
      barcodeSource,
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
          barcodeSource,
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
