/**
 * Step `extract_with_ia` — calls the IA provider to extract the product JSON.
 *
 * Implements caching by `<fileHash>:<promptVersion>` so duplicate uploads of
 * the same file skip the IA call entirely. The raw response goes into
 * `ctx.extractionRaw`; validation against ProductExtractionSchema is the next
 * step (`validate_schema`).
 *
 * See `docs/specs/E02-analisis-multimodal-ia.md §4`.
 */
import type { IaProvider } from '@/lib/ai';
import { cache } from '@/lib/cache';
import { makeTrace } from '@/lib/pipeline/trace';
import type { AnalysisContext } from '@/lib/pipeline/context';
import type { ProductExtraction } from '@schemas/product';

export const EXTRACT_PROMPT_VERSION = 'extract_product-v1' as const;
export const EXTRACT_TIMEOUT_MS = 25_000;
const MODEL_NAME = 'Phi-4-multimodal-instruct';

function cacheKey(hash: string, promptVersion: string): string {
  return `extract:${hash}:${promptVersion}`;
}

/** Exposed so validate_schema can write the validated product back. */
export function cacheExtraction(
  hash: string,
  promptVersion: string,
  product: ProductExtraction,
): void {
  cache.set(cacheKey(hash, promptVersion), product, { ttlSeconds: 60 * 60 });
}

export async function extract_with_ia(
  ctx: AnalysisContext,
  ia: IaProvider,
): Promise<AnalysisContext> {
  const startedAt = new Date();
  const cached = cache.get<ProductExtraction>(cacheKey(ctx.file.hash, EXTRACT_PROMPT_VERSION));
  if (cached) {
    return {
      ...ctx,
      product: cached,
      extractionRaw: JSON.stringify(cached),
      steps: [
        ...ctx.steps,
        makeTrace('extract_with_ia', 'ok', startedAt, {
          cached: true,
          promptVersion: EXTRACT_PROMPT_VERSION,
        }),
      ],
    };
  }

  const { raw, usage, latencyMs } = await ia.analyzeLabel(ctx.file.buffer, ctx.file.mime, {
    promptVersion: EXTRACT_PROMPT_VERSION,
    timeoutMs: EXTRACT_TIMEOUT_MS,
  });

  return {
    ...ctx,
    extractionRaw: raw,
    steps: [
      ...ctx.steps,
      makeTrace('extract_with_ia', 'ok', startedAt, {
        cached: false,
        promptVersion: EXTRACT_PROMPT_VERSION,
        model: MODEL_NAME,
        tokensIn: usage.in,
        tokensOut: usage.out,
        latencyMs,
      }),
    ],
  };
}
