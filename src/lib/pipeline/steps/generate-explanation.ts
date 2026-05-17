/**
 * Step `generate_explanation` — calls Phi-4-mini to produce a 2-3 sentence
 * plain-language summary, sanitizes the output, and caches the result.
 *
 * Per spec E03 §5.4: failure is tolerated. If the model errors or times out,
 * ctx.explanation stays undefined, the trace shows status 'skipped', and the
 * pipeline continues to persist. The UI shows a fallback string.
 */
import type { IaProvider } from '@/lib/ai';
import { sanitizeExplanation } from '@/lib/ai/sanitize-explanation';
import { cache } from '@/lib/cache';
import { logger } from '@/lib/logger';
import type { AnalysisContext } from '@/lib/pipeline/context';
import { makeTrace } from '@/lib/pipeline/trace';

export const EXPLAIN_PROMPT_VERSION = 'explain_product-v1' as const;
export const EXPLAIN_TIMEOUT_MS = 10_000;
export const EXPLAIN_CACHE_TTL_SECONDS = 60 * 60 * 24;
const MODEL_NAME = 'Phi-4-mini-instruct';

function cacheKey(hash: string): string {
  return `explain:${hash}:${EXPLAIN_PROMPT_VERSION}`;
}

export async function generate_explanation(
  ctx: AnalysisContext,
  ia: IaProvider,
): Promise<AnalysisContext> {
  const startedAt = new Date();
  if (!ctx.product) {
    throw new Error('generate_explanation: ctx.product missing (call validate_schema first)');
  }

  const cached = cache.get<string>(cacheKey(ctx.file.hash));
  if (cached) {
    return {
      ...ctx,
      explanation: cached,
      steps: [
        ...ctx.steps,
        makeTrace('generate_explanation', 'ok', startedAt, {
          cached: true,
          promptVersion: EXPLAIN_PROMPT_VERSION,
        }),
      ],
    };
  }

  try {
    const { raw, usage, latencyMs } = await ia.generateExplanation(ctx.product, {
      promptVersion: EXPLAIN_PROMPT_VERSION,
      timeoutMs: EXPLAIN_TIMEOUT_MS,
      extra: {
        reglas_aplicadas: ctx.rules?.reglas_aplicadas.join(', ') ?? '',
      },
    });

    const sanitized = sanitizeExplanation(raw);
    if (sanitized.matchedPatterns.length > 0 || sanitized.disclaimerAppended) {
      logger.info('explanation.sanitized', {
        requestId: ctx.requestId,
        patterns: sanitized.matchedPatterns,
        disclaimerAppended: sanitized.disclaimerAppended,
      });
    }

    cache.set(cacheKey(ctx.file.hash), sanitized.text, {
      ttlSeconds: EXPLAIN_CACHE_TTL_SECONDS,
    });

    logger.info('explanation.generated', {
      requestId: ctx.requestId,
      tokensIn: usage.in,
      tokensOut: usage.out,
      latencyMs,
      cached: false,
    });

    return {
      ...ctx,
      explanation: sanitized.text,
      steps: [
        ...ctx.steps,
        makeTrace('generate_explanation', 'ok', startedAt, {
          cached: false,
          promptVersion: EXPLAIN_PROMPT_VERSION,
          model: MODEL_NAME,
          tokensIn: usage.in,
          tokensOut: usage.out,
          latencyMs,
          patternsRemoved: sanitized.matchedPatterns.length,
          disclaimerAppended: sanitized.disclaimerAppended,
        }),
      ],
    };
  } catch (err) {
    // Tolerated failure (spec §5.4): pipeline continues without explanation.
    logger.warn('explanation.failed', {
      requestId: ctx.requestId,
      error: err instanceof Error ? err.message : 'unknown',
    });
    return {
      ...ctx,
      steps: [
        ...ctx.steps,
        makeTrace('generate_explanation', 'skipped', startedAt, {
          reason: 'model_failed',
          error: err instanceof Error ? err.message : 'unknown',
        }),
      ],
    };
  }
}
