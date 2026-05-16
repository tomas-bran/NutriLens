/**
 * Errores estructurados de la API.
 * Ver `docs/specs/00-overview.md §4.1`.
 */
import { z } from 'zod';

export const ERROR_CODES = [
  'unsupported_file_type',
  'file_too_large',
  'empty_file',
  'pdf_unreadable',
  'image_not_supported',
  'extraction_invalid',
  'model_timeout',
  'model_rate_limited',
  'model_error',
  'invalid_question',
  'invalid_query',
  'not_found',
  'internal_error',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export const ApiErrorSchema = z.object({
  error: z.enum(ERROR_CODES),
  reason: z.string().min(1),
  details: z.record(z.unknown()).optional(),
});

export type ApiErrorBody = z.infer<typeof ApiErrorSchema>;

/**
 * Excepción interna que se mapea a una respuesta de error estructurada.
 */
export class ApiError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly reason: string,
    public readonly httpStatus: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(`[${code}] ${reason}`);
    this.name = 'ApiError';
  }

  toBody(): ApiErrorBody {
    return {
      error: this.code,
      reason: this.reason,
      ...(this.details ? { details: this.details } : {}),
    };
  }
}
