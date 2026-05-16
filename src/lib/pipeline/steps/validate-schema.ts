/**
 * Step `validate_schema` — JSON.parse + Zod against ProductExtractionSchema.
 *
 * On failure: one corrective retry that re-prompts the IA with the previous
 * raw output and the validation issues. If that also fails, throws
 * `extraction_invalid` (HTTP 422) and the pipeline aborts (no persist).
 *
 * See `docs/specs/E02-analisis-multimodal-ia.md §5`.
 */
import { ApiError } from '@schemas/errors';
import { ProductExtractionSchema, type ProductExtraction } from '@schemas/product';
import { stripJsonFences } from '@/lib/ai';
import type { IaProvider } from '@/lib/ai';
import type { AnalysisContext } from '@/lib/pipeline/context';
import { makeTrace } from '@/lib/pipeline/trace';
import { cacheExtraction, EXTRACT_PROMPT_VERSION } from './extract-with-ia';

const CORRECTIVE_PROMPT_VERSION = 'extract_product-v1-corrective' as const;

interface ParseAttempt {
  ok: boolean;
  product?: ProductExtraction;
  reason?: 'invalid_json' | 'schema_violation';
  details?: { issues?: unknown; raw?: string };
}

function tryParse(raw: string): ParseAttempt {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFences(raw));
  } catch {
    return { ok: false, reason: 'invalid_json', details: { raw } };
  }
  const result = ProductExtractionSchema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      reason: 'schema_violation',
      details: { issues: result.error.issues, raw },
    };
  }
  return { ok: true, product: result.data };
}

export async function validate_schema(
  ctx: AnalysisContext,
  ia: IaProvider,
): Promise<AnalysisContext> {
  const startedAt = new Date();
  if (typeof ctx.extractionRaw !== 'string') {
    throw new ApiError('extraction_invalid', 'No hay salida del modelo para validar.', 422, {
      reason: 'missing_extraction_raw',
    });
  }

  const first = tryParse(ctx.extractionRaw);
  if (first.ok && first.product) {
    cacheExtraction(ctx.file.hash, EXTRACT_PROMPT_VERSION, first.product);
    return {
      ...ctx,
      product: first.product,
      steps: [...ctx.steps, makeTrace('validate_schema', 'ok', startedAt, { attempt: 1 })],
    };
  }

  // Single corrective retry — re-prompt with the previous raw + issues.
  const corrective = await ia.analyzeLabel(ctx.file.buffer, ctx.file.mime, {
    promptVersion: CORRECTIVE_PROMPT_VERSION,
    timeoutMs: 25_000,
    extra: {
      previous: ctx.extractionRaw,
      problems: JSON.stringify(first.details?.issues ?? first.reason),
    },
  });

  const second = tryParse(corrective.raw);
  if (second.ok && second.product) {
    cacheExtraction(ctx.file.hash, EXTRACT_PROMPT_VERSION, second.product);
    return {
      ...ctx,
      extractionRaw: corrective.raw,
      product: second.product,
      steps: [
        ...ctx.steps,
        makeTrace('validate_schema', 'ok', startedAt, {
          attempt: 2,
          corrective: true,
          firstReason: first.reason,
        }),
      ],
    };
  }

  throw new ApiError(
    'extraction_invalid',
    'No pudimos interpretar el resultado del análisis. Probá con otra imagen.',
    422,
    {
      firstReason: first.reason,
      secondReason: second.reason,
    },
  );
}
