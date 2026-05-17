/**
 * Step `persist` — terminal step of the analyze pipeline (spec E04 §3).
 *
 * Two behaviors:
 *   1. fileHash already exists in DB → return the existing row, NO new
 *      image write, NO new DB insert. Trace status = 'skipped' with
 *      reason 'duplicate_hash'. Log `persist.skipped_duplicate`.
 *   2. fileHash is new → write the image via getStorage().save(), insert
 *      a Product row with the full ctx (overridden apto_* + recomputed
 *      riesgo from E03), trace status = 'ok'. Log `persist.created`.
 *
 * Race protection (spec §11): if two concurrent uploads of the same hash
 * race the unique constraint, the second insert throws Prisma P2002.
 * We catch it, re-fetch, and return the winning row — same shape as the
 * normal dedup path.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { AnalysisContext } from '@/lib/pipeline/context';
import { makeTrace } from '@/lib/pipeline/trace';
import { mapCategoriaToPrisma } from '@/lib/products/serializers';
import { getStorage } from '@/lib/storage';

const PROMPT_VERSION = 'extract_product-v1' as const;

export async function persist(ctx: AnalysisContext): Promise<AnalysisContext> {
  const startedAt = new Date();
  if (!ctx.product || !ctx.rules || !ctx.extractionRaw) {
    throw new Error('persist: context not ready (product/rules/extractionRaw missing)');
  }

  const existing = await prisma.product.findUnique({ where: { fileHash: ctx.file.hash } });
  if (existing) {
    logger.info('persist.skipped_duplicate', {
      requestId: ctx.requestId,
      existingId: existing.id,
      fileHash: ctx.file.hash,
    });
    return {
      ...ctx,
      saved: existing,
      cachedFromDedup: true,
      steps: [
        ...ctx.steps,
        makeTrace('persist', 'skipped', startedAt, {
          reason: 'duplicate_hash',
          id: existing.id,
        }),
      ],
    };
  }

  const imagenPath = await getStorage().save(ctx.file.buffer, ctx.file.mime, ctx.file.hash);

  let saved;
  try {
    saved = await prisma.product.create({
      data: {
        fileHash: ctx.file.hash,
        nombre: ctx.product.producto,
        categoria: mapCategoriaToPrisma(ctx.product.categoria),
        ingredientes: JSON.stringify(ctx.product.ingredientes_detectados),
        alergenos: JSON.stringify(ctx.product.alergenos),
        sellos: JSON.stringify(ctx.product.sellos),
        aptoVegano: ctx.rules.apto_vegano,
        aptoCeliaco: ctx.rules.apto_celiaco,
        aptoSinLactosa: ctx.rules.apto_sin_lactosa,
        riesgo: ctx.product.riesgo,
        confidence: ctx.product.confidence,
        reglasAplicadas: JSON.stringify(ctx.rules.reglas_aplicadas),
        explanation: ctx.explanation ?? null,
        jsonRaw: ctx.extractionRaw,
        pipelineTrace: JSON.stringify(ctx.steps),
        imagenPath,
        promptVersion: PROMPT_VERSION,
      },
    });
  } catch (err) {
    // Spec §11 race condition: another request inserted the same hash between
    // our findUnique() and our create(). Re-fetch and treat as dedup.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const winner = await prisma.product.findUnique({ where: { fileHash: ctx.file.hash } });
      if (winner) {
        logger.info('persist.skipped_duplicate', {
          requestId: ctx.requestId,
          existingId: winner.id,
          fileHash: ctx.file.hash,
          reason: 'race_lost',
        });
        return {
          ...ctx,
          saved: winner,
          cachedFromDedup: true,
          steps: [
            ...ctx.steps,
            makeTrace('persist', 'skipped', startedAt, {
              reason: 'duplicate_hash_race',
              id: winner.id,
            }),
          ],
        };
      }
    }
    throw err;
  }

  logger.info('persist.created', {
    requestId: ctx.requestId,
    productId: saved.id,
    riesgo: saved.riesgo,
  });

  return {
    ...ctx,
    saved,
    cachedFromDedup: false,
    steps: [...ctx.steps, makeTrace('persist', 'ok', startedAt, { id: saved.id, imagenPath })],
  };
}
