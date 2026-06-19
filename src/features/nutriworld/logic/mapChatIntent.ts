/**
 * Mapea el intent del chat de NutriLens (la IA real, `parseIntent`) al
 * `ParsedIntent` de NutriWorld. Acepta una forma estructural para no acoplar
 * NutriWorld al schema interno del chat. Si no quedan filtros usables → clarify.
 */
import type { ProductCategory } from '../data/products';
import type { Risk } from '../data/products';
import type { ParsedIntent, NutriFilters } from './types';

export interface ChatIntentLike {
  categoria?: string | null;
  riesgo_max?: Risk | null;
  apto?: 'vegano' | 'celiaco' | 'sin_lactosa' | null;
}

const NUTRI_CATEGORIES: readonly string[] = ['galletitas', 'snacks', 'bebidas', 'cereales'];

export function mapChatIntent(ci: ChatIntentLike): ParsedIntent {
  const filters: NutriFilters = {};
  if (ci.apto === 'celiaco') filters.apto_celiaco = true;
  if (ci.apto === 'sin_lactosa') filters.apto_sin_lactosa = true;
  if (ci.apto === 'vegano') filters.apto_vegano = true;
  if (ci.riesgo_max) filters.max_riesgo = ci.riesgo_max;

  const category =
    ci.categoria && NUTRI_CATEGORIES.includes(ci.categoria)
      ? (ci.categoria as ProductCategory)
      : undefined;

  const hasFilter =
    category !== undefined ||
    filters.apto_celiaco === true ||
    filters.apto_sin_lactosa === true ||
    filters.apto_vegano === true ||
    filters.max_riesgo !== undefined;

  return {
    kind: hasFilter ? 'find_products' : 'clarify',
    ...(category ? { category } : {}),
    filters,
  };
}
