import type { ApiError } from '@schemas/errors';
import type { LabelKind, ProductExtraction } from '@schemas/product';
import type { StepTrace } from '@schemas/pipeline';

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
  explanation?: string;
  error?: ApiError;
}
