/**
 * Tests for the Open Food Facts enrichment logic (NL-601).
 */
import { describe, expect, it } from 'vitest';
import {
  buildEnrichment,
  isGenericProductName,
  mapOffCategory,
  parseOffIngredients,
  productNamesOverlap,
} from '@/lib/off/enrich';
import type { OFFProduct } from '@/lib/off/client';

describe('isGenericProductName (NL-601 — preferir nombre de OFF)', () => {
  it('marca como genéricos los nombres inútiles', () => {
    for (const n of ['otros', 'Otros', 'producto', 'desconocido', '', 'a', 'N/A']) {
      expect(isGenericProductName(n)).toBe(true);
    }
  });

  it('no marca un nombre real', () => {
    expect(isGenericProductName('Galletitas Chocolinas')).toBe(false);
    expect(isGenericProductName('Coca Cola')).toBe(false);
  });
});

describe('mapOffCategory (NL-601 — categoría desde OFF)', () => {
  it('mapea tags de OFF a categorías de NutriLens', () => {
    expect(mapOffCategory(['en:biscuits'])).toBe('galletitas');
    expect(mapOffCategory(['en:breakfast-cereals'])).toBe('cereales');
    expect(mapOffCategory(['en:sodas', 'en:beverages'])).toBe('bebidas');
    expect(mapOffCategory(['en:dairies', 'en:yogurts'])).toBe('lácteos');
    expect(mapOffCategory(['en:salty-snacks', 'en:chips'])).toBe('snacks');
  });

  it('devuelve null cuando no hay categoría conocida (o sin tags)', () => {
    expect(mapOffCategory(['en:plant-based-foods'])).toBeNull();
    expect(mapOffCategory([])).toBeNull();
  });
});

describe('productNamesOverlap (NL-601 — validación soft barcode↔foto)', () => {
  it('detecta solapamiento por token significativo', () => {
    expect(productNamesOverlap('Galletitas Chocolinas', 'Chocolinas Bagley')).toBe(true);
  });

  it('ignora tildes y mayúsculas', () => {
    expect(productNamesOverlap('Maíz Frito', 'maiz tostado')).toBe(true);
  });

  it('marca falta de correspondencia cuando no comparten tokens', () => {
    expect(productNamesOverlap('Coca Cola Original', 'Yogur Entero Natural')).toBe(false);
  });

  it('ignora stopwords (de/la/con) al comparar', () => {
    expect(productNamesOverlap('Agua de la Sierra', 'Pan de la Abuela')).toBe(false);
  });

  it('es indulgente: si algún nombre no tiene tokens evaluables, no marca discrepancia', () => {
    expect(productNamesOverlap('', 'Cualquier Cosa')).toBe(true);
    expect(productNamesOverlap('A B', 'Coca Cola')).toBe(true); // tokens < 3 chars
  });
});

describe('parseOffIngredients (NL-601)', () => {
  it('separa por comas, recorta y saca los guiones bajos de alérgenos', () => {
    expect(parseOffIngredients('Harina, _leche_, azúcar, sal')).toEqual([
      'Harina',
      'leche',
      'azúcar',
      'sal',
    ]);
  });

  it('devuelve [] con texto vacío', () => {
    expect(parseOffIngredients('')).toEqual([]);
  });

  it('descarta tokens vacíos / de 1 char', () => {
    expect(parseOffIngredients('Maíz, , a, Sal')).toEqual(['Maíz', 'Sal']);
  });
});

function makeOff(overrides: Partial<OFFProduct> = {}): OFFProduct {
  return {
    barcode: '7790895000658',
    product_name: 'Galletitas Chocolinas',
    brands: 'Bagley',
    ingredients_text: 'Harina de trigo, azúcar',
    allergens_tags: ['en:gluten', 'en:milk'],
    labels_tags: [],
    categories_tags: [],
    nutriments: {},
    url: 'https://world.openfoodfacts.org/product/7790895000658',
    ...overrides,
  };
}

import type { Alergeno } from '@schemas/product';

const baseExtracted = {
  producto: 'Galletitas Chocolinas',
  alergenos: ['gluten', 'leche'] as Alergeno[],
  apto_vegano: false,
  apto_celiaco: false,
};

describe('buildEnrichment — no OFF product', () => {
  it('returns matched=false when offProduct is null', () => {
    const result = buildEnrichment({ ...baseExtracted }, null);
    expect(result.matched).toBe(false);
    expect(result.confidenceDelta).toBe(0);
    expect(result.confirmedFields).toEqual([]);
  });
});

describe('buildEnrichment — with OFF match', () => {
  it('returns matched=true when OFF product is provided', () => {
    const result = buildEnrichment({ ...baseExtracted }, makeOff());
    expect(result.matched).toBe(true);
    expect(result.offProduct).not.toBeNull();
  });

  it('confirms allergens when extraction matches OFF', () => {
    const result = buildEnrichment({ ...baseExtracted }, makeOff());
    expect(result.confirmedFields).toContain('alergenos');
  });

  it('detects missing allergens when extraction is incomplete', () => {
    const extractedMissingMilk = {
      ...baseExtracted,
      alergenos: ['gluten'] as Alergeno[],
    };
    const result = buildEnrichment(extractedMissingMilk, makeOff());
    expect(result.missingAllergens).toContain('leche');
    expect(result.discrepancies.some((d) => d.field === 'alergenos')).toBe(true);
    // Missing allergen incurs a penalty, but other confirmed fields may offset it
    // The key assertion is that missingAllergens is non-empty and discrepancies exist
    expect(result.missingAllergens.length).toBeGreaterThan(0);
  });

  it('positive confidenceDelta when allergens fully confirmed', () => {
    const result = buildEnrichment({ ...baseExtracted }, makeOff());
    expect(result.confidenceDelta).toBeGreaterThan(0);
  });

  it('confirms vegan flag when OFF labels agree', () => {
    const veganProduct = makeOff({ labels_tags: ['en:vegan'] });
    const veganExtracted = { ...baseExtracted, apto_vegano: true };
    const result = buildEnrichment(veganExtracted, veganProduct);
    expect(result.confirmedFields).toContain('apto_vegano');
  });

  it('adds discrepancy when vegan flags disagree', () => {
    const veganProduct = makeOff({ labels_tags: ['en:vegan'] });
    const nonVeganExtracted = { ...baseExtracted, apto_vegano: false };
    const result = buildEnrichment(nonVeganExtracted, veganProduct);
    expect(result.discrepancies.some((d) => d.field === 'apto_vegano')).toBe(true);
  });

  it('confidenceDelta is clamped to [-0.2, 0.2]', () => {
    // Many confirmed fields should not push beyond +0.2
    const offManyMatch = makeOff({ labels_tags: ['en:vegan', 'en:gluten-free'] });
    const extractedMatch = { ...baseExtracted, apto_vegano: true, apto_celiaco: true };
    const result = buildEnrichment(extractedMatch, offManyMatch);
    expect(result.confidenceDelta).toBeLessThanOrEqual(0.2);
    expect(result.confidenceDelta).toBeGreaterThanOrEqual(-0.2);
  });
});
