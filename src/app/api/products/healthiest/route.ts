/**
 * GET /api/products/healthiest?categoria=X&topK=5
 *
 * Returns top-K healthiest products from the historial, scored by
 * riesgo + sellos + aptitudes. NL-403.
 *
 * Query params:
 *   - categoria (optional): filter by category
 *   - topK (optional): how many results to return (default 5, max 20)
 */
import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { mapCategoriaToPrisma, toListItem } from '@/lib/products/serializers';
import { rankByHealthScore } from '@/lib/products/health-score';
import type { Categoria } from '@schemas/product';
import { CATEGORIAS } from '@schemas/product';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const categoriaParam = searchParams.get('categoria');
  const topKParam = searchParams.get('topK');

  const topK = Math.min(20, Math.max(1, Number(topKParam ?? 5) || 5));

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

  // Fetch more than topK to have room for ranking
  const rows = await prisma.product.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: topK * 4, // fetch 4x and rank
  });

  const ranked = rankByHealthScore(rows).slice(0, topK);

  const results = ranked.map((p) => ({
    ...toListItem(p),
    healthScore: p.healthScore.score,
    justification: p.healthScore.justification,
    scoreBreakdown: p.healthScore.breakdown,
  }));

  return NextResponse.json({ total: results.length, productos: results });
}
