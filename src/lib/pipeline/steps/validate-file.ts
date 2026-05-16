/**
 * Step `validate_file` — first gate of the analyze pipeline.
 *
 * No IA calls here: cheap checks that protect downstream token spend.
 * See `docs/specs/E01-onboarding-y-upload.md §5`.
 */
import { ApiError } from '@schemas/errors';
import { canReadPdf } from '@/lib/pdf/can-read';
import type { AnalysisContext } from '@/lib/pipeline/context';
import { makeTrace } from '@/lib/pipeline/trace';

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'] as const;

export async function validate_file(ctx: AnalysisContext): Promise<AnalysisContext> {
  const startedAt = new Date();
  const { file } = ctx;

  if (file.sizeBytes <= 0) {
    throw new ApiError('empty_file', 'El archivo está vacío.', 400);
  }
  if (file.sizeBytes > MAX_FILE_BYTES) {
    throw new ApiError('file_too_large', 'El archivo supera el tamaño máximo de 10 MB.', 400);
  }
  if (!ALLOWED_MIME_TYPES.includes(file.mime as (typeof ALLOWED_MIME_TYPES)[number])) {
    throw new ApiError(
      'unsupported_file_type',
      'Formato no soportado. Subí una imagen (JPG/PNG) o un PDF.',
      400,
    );
  }
  if (file.mime === 'application/pdf') {
    const ok = await canReadPdf(file.buffer);
    if (!ok) {
      throw new ApiError(
        'pdf_unreadable',
        'No pudimos leer el PDF. Intentá con otro archivo.',
        400,
      );
    }
  }

  return {
    ...ctx,
    steps: [
      ...ctx.steps,
      makeTrace('validate_file', 'ok', startedAt, {
        mime: file.mime,
        sizeBytes: file.sizeBytes,
      }),
    ],
  };
}
