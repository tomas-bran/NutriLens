/**
 * Open Food Facts HTTP client (NL-602).
 *
 * - Timeout ≤3s (graceful null on failure)
 * - In-memory cache with 24h TTL
 * - User-Agent required by OFF Terms of Service
 * - Respects rate limits by timing out quickly rather than queuing
 */

const OFF_BASE = 'https://world.openfoodfacts.org';
const TIMEOUT_MS = 3_000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const USER_AGENT = 'NutriLens/1.0 (student project; contact: fmartucci@alumno.unlam.edu.ar)';

export interface OFFNutrients {
  energy_100g?: number;
  fat_100g?: number;
  saturated_fat_100g?: number;
  sugars_100g?: number;
  salt_100g?: number;
  proteins_100g?: number;
  fiber_100g?: number;
}

export interface OFFProduct {
  barcode: string;
  product_name: string;
  brands: string;
  ingredients_text: string;
  allergens_tags: string[];
  labels_tags: string[];
  /** Tags de categoría de OFF (p.ej. "en:biscuits"). Se mapean a `Categoria`. */
  categories_tags: string[];
  nutriments: OFFNutrients;
  url: string;
}

interface CacheEntry {
  value: OFFProduct | null;
  expiresAt: number;
}

// Module-level cache — survives across requests in the same Node.js process.
const cache = new Map<string, CacheEntry>();

function cacheGet(key: string): OFFProduct | null | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

function cacheSet(key: string, value: OFFProduct | null): void {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT },
    });
  } finally {
    clearTimeout(timer);
  }
}

function parseProduct(data: Record<string, unknown>, barcode: string): OFFProduct | null {
  const p = data['product'] as Record<string, unknown> | undefined;
  if (!p || typeof p['product_name'] !== 'string' || !p['product_name']) return null;

  // OFF guarda los ingredientes por idioma; el genérico `ingredients_text`
  // suele venir vacío para productos LatAm. Caemos a las variantes es/en.
  const ingredientsText =
    String(p['ingredients_text'] ?? '').trim() ||
    String(p['ingredients_text_es'] ?? '').trim() ||
    String(p['ingredients_text_en'] ?? '').trim();

  return {
    barcode,
    product_name: String(p['product_name'] ?? ''),
    brands: String(p['brands'] ?? ''),
    ingredients_text: ingredientsText,
    allergens_tags: Array.isArray(p['allergens_tags'])
      ? (p['allergens_tags'] as string[]).map(String)
      : [],
    labels_tags: Array.isArray(p['labels_tags']) ? (p['labels_tags'] as string[]).map(String) : [],
    categories_tags: Array.isArray(p['categories_tags'])
      ? (p['categories_tags'] as string[]).map(String)
      : [],
    nutriments: (p['nutriments'] as OFFNutrients) ?? {},
    url: `https://world.openfoodfacts.org/product/${barcode}`,
  };
}

export async function fetchByBarcode(barcode: string): Promise<OFFProduct | null> {
  const cacheKey = `barcode:${barcode}`;
  const cached = cacheGet(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const res = await fetchWithTimeout(
      `${OFF_BASE}/api/v2/product/${encodeURIComponent(barcode)}.json`,
    );
    if (!res.ok) {
      cacheSet(cacheKey, null);
      return null;
    }
    const data = (await res.json()) as Record<string, unknown>;
    const product = parseProduct(data, barcode);
    cacheSet(cacheKey, product);
    return product;
  } catch {
    // Timeout, network error, or JSON parse failure — fail gracefully
    return null;
  }
}

export async function fetchByName(name: string, brand?: string): Promise<OFFProduct | null> {
  const searchTerms = brand ? `${name} ${brand}` : name;
  const cacheKey = `name:${searchTerms.toLowerCase().trim()}`;
  const cached = cacheGet(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const params = new URLSearchParams({
      search_terms: searchTerms,
      action: 'process',
      json: 'true',
      page_size: '1',
      fields:
        'code,product_name,brands,ingredients_text,ingredients_text_es,ingredients_text_en,allergens_tags,labels_tags,categories_tags,nutriments',
    });
    const res = await fetchWithTimeout(`${OFF_BASE}/cgi/search.pl?${params.toString()}`);
    if (!res.ok) {
      cacheSet(cacheKey, null);
      return null;
    }
    const data = (await res.json()) as { products?: Record<string, unknown>[] };
    const first = data.products?.[0];
    if (!first) {
      cacheSet(cacheKey, null);
      return null;
    }
    const barcode = String(first['code'] ?? first['id'] ?? '');
    const product = parseProduct({ product: first }, barcode);
    cacheSet(cacheKey, product);
    return product;
  } catch {
    return null;
  }
}

/** Exposed for tests only — clears the in-process cache. */
export function _clearCache(): void {
  cache.clear();
}
