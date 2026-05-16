import { NextResponse } from 'next/server';
import { ApiError } from '@schemas/errors';
import { logger } from '@/lib/logger';

export function apiErrorResponse(err: unknown, requestId: string): NextResponse {
  if (err instanceof ApiError) {
    logger.warn('api.error', {
      requestId,
      code: err.code,
      reason: err.reason,
      httpStatus: err.httpStatus,
      ...(err.details ? { details: err.details } : {}),
    });
    return NextResponse.json(err.toBody(), {
      status: err.httpStatus,
      headers: { 'X-Request-Id': requestId },
    });
  }

  const message = err instanceof Error ? err.message : 'unknown error';
  logger.error('api.unhandled_error', { requestId, message });
  return NextResponse.json(
    { error: 'internal_error', reason: 'Error interno del servidor.' },
    { status: 500, headers: { 'X-Request-Id': requestId } },
  );
}
