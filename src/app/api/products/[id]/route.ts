/**
 * GET /api/products/[id]    — full product detail (spec E04 §5.2).
 * PATCH /api/products/[id]  — renombrar un producto (admin).
 * DELETE /api/products/[id] — soft delete (admin): marca `deletedAt`. El producto
 *   desaparece del catálogo/detalle/conteos; re-analizarlo lo restaura.
 *
 * GET/PATCH/DELETE operan solo sobre productos no borrados (deletedAt: null).
 * 200 → ProductDetail (includes jsonRaw, pipelineTrace, reglasAplicadas).
 * 404 → { error: "not_found", reason: "Producto no encontrado." }.
 *
 * Logs `history.detail_viewed` on hit, `history.not_found` on miss.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { ApiError } from '@schemas/errors';
import { apiErrorResponse } from '@/lib/api/error-response';
import { isCurrentUserAdmin } from '@/lib/auth/is-admin';
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
    const product = await prisma.product.findFirst({ where: { id, deletedAt: null } });
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const requestId = pickRequestId(request.headers.get('x-request-id'));
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json(
      { error: 'forbidden', reason: 'Solo administradores.' },
      { status: 403, headers: { 'X-Request-Id': requestId } },
    );
  }
  const { id } = await params;

  let nombre = '';
  try {
    const body = (await request.json()) as { nombre?: unknown };
    nombre = typeof body.nombre === 'string' ? body.nombre.trim() : '';
  } catch {
    nombre = '';
  }
  if (!nombre || nombre.length > 200) {
    return apiErrorResponse(
      new ApiError('invalid_query', 'El nombre es obligatorio (máx. 200 caracteres).', 400),
      requestId,
    );
  }

  try {
    const res = await prisma.product.updateMany({
      where: { id, deletedAt: null },
      data: { nombre },
    });
    if (res.count === 0) {
      return apiErrorResponse(new ApiError('not_found', 'Producto no encontrado.', 404), requestId);
    }
    logger.info('history.renamed', { requestId, productId: id });
    return NextResponse.json(
      { id, nombre },
      { status: 200, headers: { 'X-Request-Id': requestId } },
    );
  } catch {
    return apiErrorResponse(new ApiError('not_found', 'Producto no encontrado.', 404), requestId);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const requestId = pickRequestId(request.headers.get('x-request-id'));
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json(
      { error: 'forbidden', reason: 'Solo administradores.' },
      { status: 403, headers: { 'X-Request-Id': requestId } },
    );
  }
  const { id } = await params;

  try {
    // Soft delete: marca `deletedAt` en vez de borrar la fila. Solo afecta
    // productos no borrados todavía (idempotente; si ya no existe → 404).
    const res = await prisma.product.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (res.count === 0) {
      return apiErrorResponse(new ApiError('not_found', 'Producto no encontrado.', 404), requestId);
    }
    logger.info('history.soft_deleted', { requestId, productId: id });
    return NextResponse.json({ ok: true }, { status: 200, headers: { 'X-Request-Id': requestId } });
  } catch {
    return apiErrorResponse(new ApiError('not_found', 'Producto no encontrado.', 404), requestId);
  }
}

function pickRequestId(header: string | null): string {
  if (header && UUID_RE.test(header)) return header.toLowerCase();
  return randomUUID();
}
