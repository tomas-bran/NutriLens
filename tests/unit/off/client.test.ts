/**
 * Tests for the Open Food Facts client (NL-602).
 * All tests mock `fetch` so no real HTTP calls are made.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchByBarcode, fetchByName, _clearCache } from '@/lib/off/client';

const OFF_PRODUCT = {
  product_name: 'Galletitas Chocolinas',
  brands: 'Bagley',
  ingredients_text: 'Harina, azúcar, cacao',
  allergens_tags: ['en:gluten', 'en:milk'],
  labels_tags: [],
  nutriments: { energy_100g: 450, fat_100g: 15 },
};

function mockFetch(status: number, body: unknown, delay = 0) {
  return vi.fn().mockImplementation(
    () =>
      new Promise((resolve) =>
        setTimeout(
          () =>
            resolve({
              ok: status >= 200 && status < 300,
              status,
              json: () => Promise.resolve(body),
            }),
          delay,
        ),
      ),
  );
}

beforeEach(() => {
  _clearCache();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchByBarcode', () => {
  it('returns OFF product on match', async () => {
    vi.stubGlobal('fetch', mockFetch(200, { product: OFF_PRODUCT }));
    const result = await fetchByBarcode('7790895000658');
    expect(result).not.toBeNull();
    expect(result?.product_name).toBe('Galletitas Chocolinas');
    expect(result?.allergens_tags).toContain('en:gluten');
  });

  it('returns null when product not found (404)', async () => {
    vi.stubGlobal('fetch', mockFetch(404, {}));
    expect(await fetchByBarcode('0000000000000')).toBeNull();
  });

  it('returns null on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    expect(await fetchByBarcode('1234567890')).toBeNull();
  });

  it('returns cached result on second call (no extra fetch)', async () => {
    const fetchMock = mockFetch(200, { product: OFF_PRODUCT });
    vi.stubGlobal('fetch', fetchMock);
    await fetchByBarcode('7790895000658');
    await fetchByBarcode('7790895000658');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns null on 429 (rate limited)', async () => {
    vi.stubGlobal('fetch', mockFetch(429, {}));
    expect(await fetchByBarcode('123')).toBeNull();
  });

  it('returns null when product has no name', async () => {
    vi.stubGlobal('fetch', mockFetch(200, { product: { product_name: '' } }));
    expect(await fetchByBarcode('123')).toBeNull();
  });
});

describe('fetchByName', () => {
  it('returns first matching product from search results', async () => {
    vi.stubGlobal('fetch', mockFetch(200, { products: [{ code: '111', ...OFF_PRODUCT }] }));
    const result = await fetchByName('Chocolinas', 'Bagley');
    expect(result).not.toBeNull();
    expect(result?.barcode).toBe('111');
  });

  it('returns null when search returns empty products array', async () => {
    vi.stubGlobal('fetch', mockFetch(200, { products: [] }));
    expect(await fetchByName('producto inexistente')).toBeNull();
  });

  it('returns null on fetch error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
    expect(await fetchByName('Galletitas')).toBeNull();
  });
});
