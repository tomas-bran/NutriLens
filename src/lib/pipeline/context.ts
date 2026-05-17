import type { Product as PrismaProduct } from '@prisma/client';
import type { ApiError } from '@schemas/errors';
import type { LabelKind, ProductExtraction } from '@schemas/product';
import type { StepTrace } from '@schemas/pipeline';
import type { RulesResult } from '@/lib/rules/apply';

export interface AnalysisFile {
  name: string;
  mime: string;
  sizeBytes: number;
  hash: string;
  buffer: Buffer;
}

/**
 * Detect_label_kind output, enriched with a derived `lowConfidence` flag so
 * downstream consumers (UI badge, future logging) don't have to re-check the
 * threshold.
 */
export interface DetectedLabelKind extends LabelKind {
  /** True when confidence < LOW_CONFIDENCE_THRESHOLD. The UI shows a "confianza baja" badge. */
  lowConfidence: boolean;
}

export interface AnalysisContext {
  requestId: string;
  startedAt: string;
  file: AnalysisFile;
  steps: StepTrace[];
  /** Filled by detect_label_kind. Absent when that step was skipped or not yet run. */
  labelKind?: DetectedLabelKind;
  /** Raw text returned by extract_with_ia, validated downstream by validate_schema. */
  extractionRaw?: string;
  product?: ProductExtraction;
  /** Filled by apply_rules; overrides product.apto_* + drives compute_risk. */
  rules?: RulesResult;
  /** Final explanation text (sanitized). Optional — failure tolerated per spec E03 §5.4. */
  explanation?: string;
  /** Persisted product row (filled by the persist step; spec E04 §3). */
  saved?: PrismaProduct;
  /** True when persist reused an existing row by fileHash (dedup; spec E04 §3.1). */
  cachedFromDedup?: boolean;
  error?: ApiError;
}
