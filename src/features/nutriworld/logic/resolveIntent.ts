/**
 * Convierte un `ParsedIntent` (venga de reglas o de la IA) en el `AgentResult`
 * que consume el mundo: mensaje del NPC, estado, zona objetivo y productos a
 * resaltar. Es la fuente de verdad de los 3 casos del spec:
 *   - ambiguo  → thinking, pide precisión, no se mueve.
 *   - sin match → no_results, no se mueve.
 *   - con match → guiding, va a la góndola dominante y resalta.
 */
import type { NutriProduct } from '../data/products';
import type { ZoneId } from '../data/zones';
import { zoneLabel } from '../data/zones';
import { findProducts } from './findProducts';
import type { AgentResult, ParsedIntent } from './types';

const CLARIFY_MESSAGE =
  '¿Querés que priorice algo en particular? Decime una categoría (galletitas, ' +
  'snacks…), una aptitud (celíaco, vegano, sin lactosa) o un nivel de riesgo.';

const NO_RESULTS_MESSAGE =
  'No encontré productos que cumplan exactamente esos criterios. Probá ' +
  'aflojando algún filtro o pedime otra cosa.';

/** Zona donde está la mayoría de los productos encontrados. */
function dominantZone(products: NutriProduct[]): ZoneId {
  const counts = new Map<ZoneId, number>();
  for (const p of products) counts.set(p.zone, (counts.get(p.zone) ?? 0) + 1);
  let best: ZoneId = products[0]!.zone;
  let bestN = 0;
  for (const [zone, n] of counts) {
    if (n > bestN) {
      best = zone;
      bestN = n;
    }
  }
  return best;
}

/**
 * Góndola objetivo. Si el pedido tiene un filtro de aptitud principal,
 * priorizamos la góndola temática que le corresponde (vegano → Vegano, etc.)
 * SIEMPRE que tenga productos del resultado — así "mostrame veganos" guía a la
 * góndola Vegano y no a otra donde casualmente haya más matches. Si no aplica,
 * caemos a la góndola con más productos (dominante).
 */
function targetZoneFor(intent: ParsedIntent, found: NutriProduct[]): ZoneId {
  const f = intent.filters;
  const preferred: ZoneId | null = f.apto_vegano
    ? 'vegano'
    : f.apto_celiaco
      ? 'sin_tacc'
      : f.apto_sin_lactosa
        ? 'sin_lactosa'
        : null;
  if (preferred && found.some((p) => p.zone === preferred)) return preferred;
  return dominantZone(found);
}

/** "2 galletitas aptas para celíacos" — descripción legible del pedido. */
function describe(intent: ParsedIntent, n: number): string {
  const noun = intent.category ?? (n === 1 ? 'opción' : 'opciones');
  const aptos: string[] = [];
  if (intent.filters.apto_celiaco) aptos.push('aptas para celíacos');
  if (intent.filters.apto_vegano) aptos.push('veganas');
  if (intent.filters.apto_sin_lactosa) aptos.push('sin lactosa');
  if (intent.filters.max_riesgo) aptos.push(`de riesgo ${intent.filters.max_riesgo}`);
  const tail = aptos.length > 0 ? ` ${aptos.join(' y ')}` : '';
  return `${n} ${noun}${tail}`;
}

export function resolveIntent(intent: ParsedIntent, products: NutriProduct[]): AgentResult {
  const base = {
    category: intent.category ?? null,
    filters: intent.filters,
  };

  if (intent.kind === 'clarify') {
    return {
      ...base,
      message: CLARIFY_MESSAGE,
      status: 'thinking',
      targetZone: null,
      highlightProductIds: [],
      recommended: [],
    };
  }

  const found = findProducts(intent, products);
  if (found.length === 0) {
    return {
      ...base,
      message: NO_RESULTS_MESSAGE,
      status: 'no_results',
      targetZone: null,
      highlightProductIds: [],
      recommended: [],
    };
  }

  const targetZone = targetZoneFor(intent, found);
  return {
    ...base,
    message: `Encontré ${describe(intent, found.length)}. Acompañame a la góndola ${zoneLabel(targetZone)}.`,
    status: 'guiding',
    targetZone,
    highlightProductIds: found.map((p) => p.id),
    recommended: found,
  };
}
