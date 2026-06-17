/**
 * enrich_with_off — pipeline step (NL-601).
 *
 * Queries Open Food Facts after extraction. Failure is non-blocking:
 * the analysis continues normally regardless of OFF availability.
 */
import { logger } from '@/lib/logger';
import { fetchByBarcode, fetchByName } from '@/lib/off/client';
import { buildEnrichment, parseOffIngredients } from '@/lib/off/enrich';
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

    // MERGE (NL-601): OFF es fuente autoritativa, no un cross-check. En vez de
    // mostrar discrepancias, incorporamos su data al producto y dejamos que
    // apply_rules/compute_risk/explicación trabajen sobre el resultado mergeado.
    const usedBarcode = barcode !== null;
    let updatedProduct = product;
    if (enrichment.matched && offProduct) {
      // Alérgenos: unión (nunca perdemos los del label; sumamos los de OFF).
      // Es seguro: solo agrega flags. apply_rules deriva las aptitudes de acá.
      const mergedAllergens = [...new Set([...product.alergenos, ...enrichment.missingAllergens])];

      // Ingredientes: con barcode (autoritativo) preferimos OFF; por nombre,
      // solo si la IA no detectó ninguno (evita inyectar los de un mal match).
      const offIngredients = parseOffIngredients(offProduct.ingredients_text);
      const mergedIngredients =
        offIngredients.length > 0 && (usedBarcode || product.ingredientes_detectados.length === 0)
          ? offIngredients
          : product.ingredientes_detectados;

      // Confianza: match por barcode = dato autoritativo → piso alto; por
      // nombre → bump moderado. Nunca baja por debajo de la confianza del modelo.
      const mergedConfidence = Math.max(product.confidence, usedBarcode ? 0.9 : 0.8);

      updatedProduct = {
        ...product,
        alergenos: mergedAllergens,
        ingredientes_detectados: mergedIngredients,
        confidence: mergedConfidence,
      };
    }

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
