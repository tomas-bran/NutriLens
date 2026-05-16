import type { ApiError } from '@schemas/errors';
import type { ProductExtraction } from '@schemas/product';
import type { StepTrace } from '@schemas/pipeline';

export interface AnalysisFile {
  name: string;
  mime: string;
  sizeBytes: number;
  hash: string;
  buffer: Buffer;
}

export interface AnalysisContext {
  requestId: string;
  startedAt: string;
  file: AnalysisFile;
  steps: StepTrace[];
  /** Raw text returned by extract_with_ia, validated downstream by validate_schema. */
  extractionRaw?: string;
  product?: ProductExtraction;
  explanation?: string;
  error?: ApiError;
}
