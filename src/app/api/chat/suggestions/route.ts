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

/** Tamaño de la muestra que alimenta el prompt. */
const SAMPLE_SIZE = 12;
/** Pool del que muestreamos: tomamos los más recientes y barajamos, así cada
 *  "Generar otras" puede arrojar sugerencias distintas (variedad por click). */
const POOL_SIZE = 40;

export async function GET(): Promise<NextResponse> {
  try {
    const pool = await prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: POOL_SIZE,
    });
    if (pool.length === 0) return NextResponse.json({ suggestions: null });

    const sample = shuffle(pool).slice(0, SAMPLE_SIZE);
    const ia = getIaProvider();
    const suggestions = await generateStarterSuggestions(sample.map(toSavedProductLite), { ia });
    return NextResponse.json({ suggestions });
  } catch (err) {
    logger.warn('chat.starter_suggestions_failed', {
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ suggestions: null });
  }
}

/** Fisher–Yates, sin mutar el array original. */
function shuffle<T>(arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
