/**
 * POST /api/nutriworld/agent — el "cerebro" del NPC NutriLens.
 *
 * Interpreta la consulta con la IA REAL del chat (`parseChatIntent`) y, si la
 * IA no está disponible o no saca filtros usables, cae a un parser por REGLAS.
 * Devuelve el mensaje del NPC + zona objetivo + productos a resaltar.
 *
 * Admin-only (NutriWorld es una experiencia beta gated por rol).
 */
import { NextResponse } from 'next/server';
import { getIaProvider } from '@/lib/ai';
import { isCurrentUserAdmin } from '@/lib/auth/is-admin';
import { parseChatIntent } from '@/lib/chat/parse-intent';
import { logger } from '@/lib/logger';
import { PRODUCTS } from '@/features/nutriworld/data/products';
import { zoneLabel } from '@/features/nutriworld/data/zones';
import { mapChatIntent } from '@/features/nutriworld/logic/mapChatIntent';
import { parseQuery } from '@/features/nutriworld/logic/parseQuery';
import { resolveIntent } from '@/features/nutriworld/logic/resolveIntent';
import type { AgentResponse, ParsedIntent } from '@/features/nutriworld/logic/types';
import type { SavedProductLite } from '@/lib/ai/types';

/** Limpia la línea hablada del NPC: sin Markdown, sin disclaimer, una sola
 * línea acotada (entra en la burbuja + TTS). */
function sanitizeNpcLine(raw: string): string {
  return raw
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // [texto](url) → texto
    .replace(/[*_`#>]/g, '') // marcas markdown
    .replace(/Basado en productos del catálogo\.?\s*NutriLens es un asistente informativo\.?/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240)
    .trim();
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<NextResponse> {
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let query = '';
  try {
    const body = (await request.json()) as { query?: unknown };
    query = typeof body.query === 'string' ? body.query.trim() : '';
  } catch {
    query = '';
  }
  if (!query) {
    return NextResponse.json({ error: 'empty_query' }, { status: 400 });
  }

  let parsed: ParsedIntent;
  let source: 'ai' | 'rules' = 'ai';
  let iaReachable = true;
  try {
    const { intent } = await parseChatIntent(query, { ia: getIaProvider() });
    parsed = mapChatIntent(intent);
    // La IA no sacó filtros usables → probamos reglas (capturan keywords que la
    // IA pudo perder). Si las reglas tampoco, queda en clarify.
    if (parsed.kind === 'clarify') {
      const byRules = parseQuery(query);
      if (byRules.kind === 'find_products') {
        parsed = byRules;
        source = 'rules';
      }
    }
  } catch (err) {
    logger.warn('nutriworld.agent.ia_failed', {
      message: err instanceof Error ? err.message : String(err),
    });
    parsed = parseQuery(query);
    source = 'rules';
    iaReachable = false;
  }

  const result = resolveIntent(parsed, PRODUCTS);
  let message = result.message;

  // Diálogo del NPC generado por la IA real: cuando guiamos y la IA está
  // disponible, NutriLens "habla" con sus propias palabras (con los productos
  // como contexto). Si falla, queda la frase por reglas (fallback silencioso).
  if (result.status === 'guiding' && iaReachable && result.recommended.length > 0) {
    try {
      const lite: SavedProductLite[] = result.recommended.map((p) => ({
        id: p.id,
        nombre: p.name,
        categoria: p.category,
        riesgo: p.risk,
        alergenos: p.allergens,
        sellos: p.seals,
        ingredientes: p.ingredients,
      }));
      const { raw } = await getIaProvider().answerWithContext(query, lite, {
        promptVersion: 'nutriworld_npc-v1',
        extra: { zona: zoneLabel(result.targetZone) },
      });
      const line = sanitizeNpcLine(raw);
      if (line) message = line;
    } catch (err) {
      logger.warn('nutriworld.agent.dialogue_failed', {
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const response: AgentResponse = {
    message,
    status: result.status,
    targetZone: result.targetZone,
    highlightProductIds: result.highlightProductIds,
    source,
  };
  return NextResponse.json(response);
}
