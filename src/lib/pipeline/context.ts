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
  product?: ProductExtraction;
  explanation?: string;
  error?: ApiError;
}
