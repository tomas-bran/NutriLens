/**
 * POST /api/chat/suggestions — sugerencias de arranque generadas por IA,
 * ancladas en las PREFERENCIAS del usuario (NL-208) y en el CATÁLOGO que cargó
 * (data grounding). Alimenta el botón "Más sugerencias" del empty state.
 *
 * Reusa `generateSuggestions` (mismo modelo mini que las pills de seguimiento):
 * le pasamos una "pregunta semilla" + las prefs como contexto y una muestra
 * reciente del catálogo. Fail-open SIEMPRE → caemos al set estático.
 */
import { NextResponse } from 'next/server';
import { getIaProvider } from '@/lib/ai';
import { getUserId } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { describePrefs, getUserPrefs } from '@/lib/prefs/server';
import { generateSuggestions } from '@/lib/chat/generate-suggestions';
import { toSavedProductLite } from '@/lib/chat/generate-answer';
import { CHAT_SUGGESTIONS } from '@/components/chat/types';

export const runtime = 'nodejs';

export async function POST(): Promise<NextResponse> {
  try {
    const userId = await getUserId();
    const userPrefs = userId ? describePrefs(await getUserPrefs(userId)) : '';

    // Muestra reciente del catálogo para anclar las sugerencias en lo real.
    const rows = await prisma.product.findMany({ orderBy: { createdAt: 'desc' }, take: 12 });
    const products = rows.map(toSavedProductLite);

    const seed = [
      'Proponé preguntas cortas y variadas para empezar a explorar estos productos.',
      userPrefs,
    ]
      .filter(Boolean)
      .join(' ');

    const suggestions = await generateSuggestions(seed, '', products, { ia: getIaProvider() });

    return NextResponse.json({ suggestions: suggestions ?? [...CHAT_SUGGESTIONS] });
  } catch {
    return NextResponse.json({ suggestions: [...CHAT_SUGGESTIONS] });
  }
}
