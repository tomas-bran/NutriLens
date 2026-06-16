/**
 * GET /api/products — catálogo paginado y filtrable (spec E04 §5.1).
 *
 * Query params: categoria, riesgo, alergeno, apto, q, page, pageSize, sort.
 * Response shape: { items: ProductListItem[], page, pageSize, total, totalPages }.
 * Trimmed payload — no jsonRaw, no pipelineTrace, no ingredientes, no
 * explanation (spec §5.1 nota).
 *
 * Errors: 400 invalid_query (Zod validation fail), 500 internal_error.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { ApiError } from '@schemas/errors';
import { apiErrorResponse } from '@/lib/api/error-response';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { mapCategoriaToPrisma, toListItem } from '@/lib/products/serializers';
import { ProductsQuerySchema, type Apto } from '@/lib/products/query-schema';

export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = pickRequestId(request.headers.get('x-request-id'));

  try {
    const url = new URL(request.url);
    const parsed = ProductsQuerySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) {
      throw new ApiError('invalid_query', 'Parámetros de búsqueda inválidos.', 400, {
        issues: parsed.error.issues,
      });
    }
    const q = parsed.data;

    const where: Prisma.ProductWhereInput = {};
    if (q.categoria) where.categoria = mapCategoriaToPrisma(q.categoria);
    if (q.riesgo) where.riesgo = q.riesgo;
    if (q.q) where.nombre = { contains: q.q, mode: 'insensitive' };
    // alergenos is JSON-serialized text, not a Postgres array. Match the
    // string literally — `["gluten",...]` always wraps the value in quotes,
    // so a substring search on the stringified form is good enough.
    if (q.alergeno) where.alergenos = { contains: `"${q.alergeno}"` };
    if (q.apto) {
      Object.assign(where, aptoFilter(q.apto));
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      q.sort === 'nombre:asc' ? { nombre: 'asc' } : { createdAt: 'desc' };
    const skip = (q.page - 1) * q.pageSize;

    const [items, total] = await Promise.all([
      prisma.product.findMany({ where, orderBy, skip, take: q.pageSize }),
      prisma.product.count({ where }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / q.pageSize);

    logger.info('history.listed', {
      requestId,
      filters: {
        categoria: q.categoria,
        riesgo: q.riesgo,
        alergeno: q.alergeno,
        apto: q.apto,
        q: q.q,
      },
      total,
      page: q.page,
      pageSize: q.pageSize,
    });

    return NextResponse.json(
      {
        items: items.map(toListItem),
        page: q.page,
        pageSize: q.pageSize,
        total,
        totalPages,
      },
      { status: 200, headers: { 'X-Request-Id': requestId } },
    );
  } catch (err) {
    return apiErrorResponse(err, requestId);
  }
}

function aptoFilter(apto: Apto): Prisma.ProductWhereInput {
  switch (apto) {
    case 'vegano':
      return { aptoVegano: true };
    case 'celiaco':
      return { aptoCeliaco: true };
    case 'sin_lactosa':
      return { aptoSinLactosa: true };
  }
}

function pickRequestId(header: string | null): string {
  if (header && UUID_RE.test(header)) return header.toLowerCase();
  return randomUUID();
}
