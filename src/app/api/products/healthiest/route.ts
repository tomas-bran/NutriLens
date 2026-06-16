/**
 * GET /api/products/healthiest?categoria=X&topK=5
 *
 * Returns top-K healthiest products from the catálogo, scored by
 * riesgo + sellos + aptitudes. NL-403.
 *
 * Query params:
 *   - categoria (optional): filter by category
 *   - topK (optional): how many results to return (default 5, max 20)
 */
import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { apiErrorResponse } from '@/lib/api/error-response';
import { prisma } from '@/lib/db';
import { mapCategoriaToPrisma, toListItem } from '@/lib/products/serializers';
import { rankByHealthScore } from '@/lib/products/health-score';
import type { Categoria } from '@schemas/product';
import { CATEGORIAS } from '@schemas/product';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = request.nextUrl;
    const categoriaParam = searchParams.get('categoria');
    const topKParam = searchParams.get('topK');

    const topK = Math.min(20, Math.max(1, Math.floor(Number(topKParam ?? 5)) || 5));

    const where: Record<string, unknown> = {};
    if (categoriaParam) {
      if (!(CATEGORIAS as readonly string[]).includes(categoriaParam)) {
        return NextResponse.json(
          { error: 'invalid_query', reason: `Categoría '${categoriaParam}' no válida.` },
          { status: 400 },
        );
      }
      where.categoria = mapCategoriaToPrisma(categoriaParam as Categoria);
    }

    // The ranking needs the full candidate set: any windowed fetch (e.g. the
    // N most recent) can leave the actual healthiest products out. At
    // catálogo scale this is cheap; if it grows, move the score into SQL
    // and order there.
    const rows = await prisma.product.findMany({ where });

    const ranked = rankByHealthScore(rows).slice(0, topK);

    const results = ranked.map((p) => ({
      ...toListItem(p),
      healthScore: p.healthScore.score,
      justification: p.healthScore.justification,
      scoreBreakdown: p.healthScore.breakdown,
    }));

    return NextResponse.json({ total: results.length, productos: results });
  } catch (err) {
    return apiErrorResponse(err, randomUUID());
  }
}
