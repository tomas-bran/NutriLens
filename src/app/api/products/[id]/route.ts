/**
 * GET /api/products/[id] — full product detail (spec E04 §5.2).
 *
 * 200 → ProductDetail (includes jsonRaw, pipelineTrace, reglasAplicadas).
 * 404 → { error: "not_found", reason: "Producto no encontrado." }.
 *
 * Logs `history.detail_viewed` on hit, `history.not_found` on miss.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { ApiError } from '@schemas/errors';
import { apiErrorResponse } from '@/lib/api/error-response';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { toDetail } from '@/lib/products/serializers';

export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const requestId = pickRequestId(request.headers.get('x-request-id'));
  const { id } = await params;

  try {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      logger.info('history.not_found', { requestId, productId: id });
      throw new ApiError('not_found', 'Producto no encontrado.', 404);
    }

    logger.info('history.detail_viewed', { requestId, productId: id });
    return NextResponse.json(toDetail(product), {
      status: 200,
      headers: { 'X-Request-Id': requestId },
    });
  } catch (err) {
    return apiErrorResponse(err, requestId);
  }
}

function pickRequestId(header: string | null): string {
  if (header && UUID_RE.test(header)) return header.toLowerCase();
  return randomUUID();
}
