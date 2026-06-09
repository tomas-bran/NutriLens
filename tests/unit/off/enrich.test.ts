/**
 * Tests for the Open Food Facts enrichment logic (NL-601).
 */
import { describe, expect, it } from 'vitest';
import { buildEnrichment } from '@/lib/off/enrich';
import type { OFFProduct } from '@/lib/off/client';

function makeOff(overrides: Partial<OFFProduct> = {}): OFFProduct {
  return {
    barcode: '7790895000658',
    product_name: 'Galletitas Chocolinas',
    brands: 'Bagley',
    ingredients_text: 'Harina de trigo, azúcar',
    allergens_tags: ['en:gluten', 'en:milk'],
    labels_tags: [],
    nutriments: {},
    url: 'https://world.openfoodfacts.org/product/7790895000658',
    ...overrides,
  };
}

const baseExtracted = {
  producto: 'Galletitas Chocolinas',
  alergenos: ['gluten', 'leche'] as const,
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
      alergenos: ['gluten'] as typeof baseExtracted.alergenos,
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
