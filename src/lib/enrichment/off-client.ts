/**
 * Cliente para Open Food Facts (OFF) — API pública de productos alimentarios.
 *
 * Lo usamos como fuente secundaria: si la extracción del LLM viene flaca
 * (ej. ingredientes_detectados vacío porque la foto no muestra el dorso),
 * buscamos el producto por nombre en OFF y mergeamos los campos faltantes.
 *
 * Docs: https://openfoodfacts.github.io/openfoodfacts-server/api/
 * Rate limit: ~100 req/min por IP. Pedido buen ciudadano: enviar User-Agent
 * con el nombre del proyecto.
 *
 * Esta capa NO conoce el dominio NutriLens — devuelve la data cruda. El
 * merge (qué pisa qué) vive en `merge-off.ts`.
 */
import { logger } from '@/lib/logger';

const OFF_BASE_URL = 'https://world.openfoodfacts.org/api/v2/search';
const OFF_USER_AGENT = 'NutriLens/0.1 (https://github.com/FedericoMartucci/NutriLens)';
const OFF_TIMEOUT_MS = 3_000;
const OFF_PAGE_SIZE = 3;

export interface OffMatch {
  /** ID del producto en OFF (código de barras si lo hay). */
  code: string;
  productName: string;
  brands: string;
  countries: string;
  ingredientsText: string;
  /** Tags `en:gluten`, `en:milk`, etc. — los normalizamos en merge-off. */
  allergensTags: string[];
  /** Aditivos detectados por OFF (E numbers). Informativo. */
  additivesTags: string[];
  /** Letra A-E del Nutri-Score si OFF la calculó. */
  nutriscoreGrade: string | null;
}

/**
 * Busca un producto por nombre en OFF, priorizando matches argentinos.
 * Devuelve el primer match razonable o `null` si no encuentra nada.
 *
 * Timeout: 3s. Errores se loguean pero no se propagan — OFF caído NO
 * rompe el pipeline de análisis (el step es enrichment opcional).
 */
export async function searchOpenFoodFacts(productName: string): Promise<OffMatch | null> {
  const term = productName.trim();
  if (!term) return null;

  const url =
    `${OFF_BASE_URL}` +
    `?search_terms=${encodeURIComponent(term)}` +
    `&countries_tags=argentina` +
    `&fields=code,product_name,brands,countries,ingredients_text_es,ingredients_text,allergens_tags,additives_tags,nutriscore_grade` +
    `&page_size=${OFF_PAGE_SIZE}` +
    `&json=1`;

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), OFF_TIMEOUT_MS);
  const start = Date.now();
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': OFF_USER_AGENT, Accept: 'application/json' },
      signal: ctrl.signal,
    });
    if (!res.ok) {
      logger.warn('off.http_error', { status: res.status, url });
      return null;
    }
    const body = (await res.json()) as OffSearchResponse;
    const first = body.products?.[0];
    if (!first) return null;
    return {
      code: first.code ?? '',
      productName: first.product_name ?? '',
      brands: first.brands ?? '',
      countries: first.countries ?? '',
      // Preferimos español si OFF lo tiene; si no, el campo genérico.
      ingredientsText: first.ingredients_text_es || first.ingredients_text || '',
      allergensTags: Array.isArray(first.allergens_tags) ? first.allergens_tags : [],
      additivesTags: Array.isArray(first.additives_tags) ? first.additives_tags : [],
      nutriscoreGrade: first.nutriscore_grade ?? null,
    };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      logger.warn('off.timeout', { timeoutMs: OFF_TIMEOUT_MS });
    } else {
      logger.warn('off.fetch_error', {
        message: err instanceof Error ? err.message : 'unknown',
      });
    }
    return null;
  } finally {
    clearTimeout(timeout);
    logger.info('off.search_done', { term, latencyMs: Date.now() - start });
  }
}

interface OffSearchResponse {
  count?: number;
  products?: OffProductRaw[];
}

interface OffProductRaw {
  code?: string;
  product_name?: string;
  brands?: string;
  countries?: string;
  ingredients_text_es?: string;
  ingredients_text?: string;
  allergens_tags?: string[];
  additives_tags?: string[];
  nutriscore_grade?: string;
}
