/**
 * GET /api/products/[id]/similar?k=4 — productos similares por embedding
 * (NL-405). Cosine sobre pgvector; si el producto no tiene embedding
 * (pre-backfill) devuelve lista vacía, nunca error.
 */
import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { apiErrorResponse } from '@/lib/api/error-response';
import { findSimilarProducts } from '@/lib/rag/semantic-search';
import { toListItem } from '@/lib/products/serializers';

const DEFAULT_K = 4;
const MAX_K = 8;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const kParam = Number(request.nextUrl.searchParams.get('k') ?? DEFAULT_K);
    const k = Math.min(MAX_K, Math.max(1, Math.floor(kParam) || DEFAULT_K));

    const similares = await findSimilarProducts(id, k);
    return NextResponse.json({
      total: similares.length,
      productos: similares.map(toListItem),
    });
  } catch (err) {
    return apiErrorResponse(err, randomUUID());
  }
}
