/**
 * GET /api/chat/suggestions — sugerencias INICIALES del chat (NL-503),
 * autogeneradas por IA a partir de una muestra del catálogo. El empty state del
 * chat las pide al montar y, si no hay (catálogo vacío o generación fallida),
 * cae a las sugerencias estáticas. Fail-open: nunca 5xx — devuelve
 * `{ suggestions: null }` ante cualquier problema.
 */
import { NextResponse } from 'next/server';
import { getIaProvider } from '@/lib/ai';
import { toSavedProductLite } from '@/lib/chat/generate-answer';
import { generateStarterSuggestions } from '@/lib/chat/generate-suggestions';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Muestra del catálogo que alimenta el prompt (los más recientes). */
const SAMPLE_SIZE = 12;

export async function GET(): Promise<NextResponse> {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      take: SAMPLE_SIZE,
    });
    if (products.length === 0) return NextResponse.json({ suggestions: null });

    const ia = getIaProvider();
    const suggestions = await generateStarterSuggestions(products.map(toSavedProductLite), { ia });
    return NextResponse.json({ suggestions });
  } catch (err) {
    logger.warn('chat.starter_suggestions_failed', {
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ suggestions: null });
  }
}
