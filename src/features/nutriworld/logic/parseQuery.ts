/**
 * Parser por REGLAS de la consulta del usuario (NutriWorld beta + fallback del
 * agente IA). Normaliza tildes/case y matchea keywords contra categoría,
 * aptitudes y riesgo. Si no encuentra ningún filtro usable → `clarify`
 * (consulta ambigua, el NPC pide más datos).
 */
import type { ProductCategory } from '../data/products';
import type { ParsedIntent, NutriFilters } from './types';

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

const CATEGORY_KEYWORDS: Array<[ProductCategory, RegExp]> = [
  ['galletitas', /galletit|galleta|cookie/],
  ['snacks', /snack|papa|chips|frutos secos|mani|mix/],
  ['bebidas', /bebida|leche|jugo|agua|yogur|trago/],
  ['cereales', /cereal|barrita|granola|avena/],
];

export function parseQuery(query: string): ParsedIntent {
  const q = normalize(query);
  const filters: NutriFilters = {};

  if (/celiac|sin tacc|sin gluten|sintacc/.test(q)) filters.apto_celiaco = true;
  if (/sin lactosa|deslactos|lactose free/.test(q)) filters.apto_sin_lactosa = true;
  if (/vegan/.test(q)) filters.apto_vegano = true;

  if (/riesgo bajo|bajo riesgo|saludable|sano|mas sano|nutritiv/.test(q)) {
    filters.max_riesgo = 'bajo';
  } else if (/riesgo medio/.test(q)) {
    filters.max_riesgo = 'medio';
  } else if (/riesgo alto/.test(q)) {
    filters.max_riesgo = 'alto';
  }

  let category: ProductCategory | undefined;
  for (const [cat, re] of CATEGORY_KEYWORDS) {
    if (re.test(q)) {
      category = cat;
      break;
    }
  }

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
