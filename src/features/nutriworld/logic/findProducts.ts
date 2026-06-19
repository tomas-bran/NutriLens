/**
 * Filtra productos según un `ParsedIntent`. Reglas (todas AND):
 *  - categoría exacta (si se especificó),
 *  - cada aptitud pedida debe ser true,
 *  - riesgo: match EXACTO (pedir "riesgo bajo" no debe traer medio/alto).
 */
import type { NutriProduct } from '../data/products';
import type { ParsedIntent } from './types';

export function findProducts(intent: ParsedIntent, products: NutriProduct[]): NutriProduct[] {
  const { category, filters } = intent;
  return products.filter((p) => {
    if (category && p.category !== category) return false;
    if (filters.apto_celiaco && !p.aptoCeliaco) return false;
    if (filters.apto_sin_lactosa && !p.aptoSinLactosa) return false;
    if (filters.apto_vegano && !p.aptoVegano) return false;
    if (filters.max_riesgo && p.risk !== filters.max_riesgo) return false;
    return true;
  });
}
