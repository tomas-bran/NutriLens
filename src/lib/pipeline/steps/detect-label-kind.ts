/**
 * Step `detect_label_kind` — cheap pre-filter that rejects non-food images
 * before they hit the expensive extraction step.
 *
 * Per spec E01 §6:
 *   - Calls Phi-4-multimodal with `detect_label_kind-v1`.
 *   - Caches the result by `label_kind:<fileHash>` for 1 h so re-uploads of
 *     the same file skip the IA call.
 *   - If `is_food_label === false` AND `confidence >= 0.6` → throw 422
 *     `image_not_supported` (the pipeline aborts, nothing persists).
 *   - If `confidence < 0.6` → pass through with `lowConfidence: true` so the
 *     UI can show a "confianza baja" badge.
 */
import { ApiError } from '@schemas/errors';
import { LabelKindSchema } from '@schemas/product';
import { stripJsonFences } from '@/lib/ai';
import type { IaProvider } from '@/lib/ai';
import { cache } from '@/lib/cache';
import type { AnalysisContext, DetectedLabelKind } from '@/lib/pipeline/context';
import { makeTrace } from '@/lib/pipeline/trace';

export const DETECT_PROMPT_VERSION = 'detect_label_kind-v1' as const;
export const LABEL_KIND_CACHE_TTL_SECONDS = 60 * 60;
export const NOT_FOOD_REJECT_THRESHOLD = 0.6;
export const LOW_CONFIDENCE_THRESHOLD = 0.6;
const MODEL_NAME = 'Phi-4-multimodal-instruct';

function cacheKey(hash: string): string {
  return `label_kind:${hash}`;
}

export async function detect_label_kind(
  ctx: AnalysisContext,
  ia: IaProvider,
): Promise<AnalysisContext> {
  const startedAt = new Date();

  const cached = cache.get<DetectedLabelKind>(cacheKey(ctx.file.hash));
  if (cached) {
    enforceRejection(cached);
    return {
      ...ctx,
      labelKind: cached,
      steps: [
        ...ctx.steps,
        makeTrace('detect_label_kind', 'ok', startedAt, {
          cached: true,
          is_food_label: cached.is_food_label,
          confidence: cached.confidence,
          lowConfidence: cached.lowConfidence,
        }),
      ],
    };
  }

  const { raw, usage, latencyMs } = await ia.classifyLabelKind(ctx.file.buffer, ctx.file.mime, {
    promptVersion: DETECT_PROMPT_VERSION,
  });

  const parsedJson = safeParseJson(raw);
  const parsed = LabelKindSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new ApiError(
      'image_not_supported',
      'No pudimos validar el contenido de la imagen. Probá con otra foto.',
      422,
      { reason: 'classifier_returned_invalid_json', raw },
    );
  }

  const detected: DetectedLabelKind = {
    ...parsed.data,
    lowConfidence: parsed.data.confidence < LOW_CONFIDENCE_THRESHOLD,
  };

  // Cache happens BEFORE rejection so re-uploads of a known-not-food file
  // short-circuit without hitting the model again.
  cache.set(cacheKey(ctx.file.hash), detected, { ttlSeconds: LABEL_KIND_CACHE_TTL_SECONDS });

  enforceRejection(detected);

  return {
    ...ctx,
    labelKind: detected,
    steps: [
      ...ctx.steps,
      makeTrace('detect_label_kind', 'ok', startedAt, {
        cached: false,
        is_food_label: detected.is_food_label,
        confidence: detected.confidence,
        lowConfidence: detected.lowConfidence,
        promptVersion: DETECT_PROMPT_VERSION,
        model: MODEL_NAME,
        tokensIn: usage.in,
        tokensOut: usage.out,
        latencyMs,
      }),
    ],
  };
}

function enforceRejection(detected: DetectedLabelKind): void {
  if (!detected.is_food_label && detected.confidence >= NOT_FOOD_REJECT_THRESHOLD) {
    throw new ApiError(
      'image_not_supported',
      'La imagen no parece corresponder a un producto alimentario.',
      422,
      { confidence: detected.confidence },
    );
  }
}

function safeParseJson(raw: string): unknown {
  try {
    return JSON.parse(stripJsonFences(raw));
  } catch {
    return null;
  }
}
