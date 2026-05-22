/**
 * Tests del merger LLM ↔ OFF (PR-OFF, audit §2).
 *
 * El LLM tiene precedencia donde ya extrajo data; OFF sólo rellena los
 * huecos (ingredientes/alérgenos vacíos).
 */
import { describe, expect, it } from 'vitest';
import {
  mergeOffIntoExtraction,
  normalizeAllergens,
  parseIngredientsText,
} from '@/lib/enrichment/merge-off';
import type { OffMatch } from '@/lib/enrichment/off-client';
import type { ProductExtraction } from '@schemas/product';

function makeProduct(overrides: Partial<ProductExtraction> = {}): ProductExtraction {
  return {
    producto: 'Test',
    categoria: 'otros',
    ingredientes_detectados: [],
    alergenos: [],
    sellos: [],
    apto_vegano: true,
    apto_celiaco: true,
    apto_sin_lactosa: true,
    riesgo: 'bajo',
    confidence: 0.9,
    ...overrides,
  };
}

function makeOff(overrides: Partial<OffMatch> = {}): OffMatch {
  return {
    code: '7790001234',
    productName: 'Galletitas X',
    brands: 'Marca X',
    countries: 'Argentina',
    ingredientsText: '',
    allergensTags: [],
    additivesTags: [],
    nutriscoreGrade: null,
    ...overrides,
  };
}

describe('mergeOffIntoExtraction — relleno de huecos', () => {
  it('completa ingredientes vacíos con los de OFF', () => {
    const p = makeProduct({ ingredientes_detectados: [] });
    const off = makeOff({ ingredientsText: 'Harina de trigo, azúcar, sal.' });
    const r = mergeOffIntoExtraction(p, off);
    expect(r.product.ingredientes_detectados).toEqual(['harina de trigo', 'azúcar', 'sal']);
    expect(r.filledFromOff).toContain('ingredientes_detectados');
  });

  it('NO pisa ingredientes que el LLM ya pescó', () => {
    const p = makeProduct({ ingredientes_detectados: ['cacao', 'azúcar'] });
    const off = makeOff({ ingredientsText: 'Harina, sal.' });
    const r = mergeOffIntoExtraction(p, off);
    expect(r.product.ingredientes_detectados).toEqual(['cacao', 'azúcar']);
    expect(r.filledFromOff).not.toContain('ingredientes_detectados');
  });

  it('completa alérgenos vacíos mapeando tags en:* a vocab NutriLens', () => {
    const p = makeProduct({ alergenos: [] });
    const off = makeOff({ allergensTags: ['en:gluten', 'en:milk'] });
    const r = mergeOffIntoExtraction(p, off);
    expect(r.product.alergenos).toEqual(expect.arrayContaining(['gluten', 'leche']));
    expect(r.filledFromOff).toContain('alergenos');
  });

  it('NO pisa alérgenos que el LLM ya pescó', () => {
    const p = makeProduct({ alergenos: ['gluten'] });
    const off = makeOff({ allergensTags: ['en:milk'] });
    const r = mergeOffIntoExtraction(p, off);
    expect(r.product.alergenos).toEqual(['gluten']);
    expect(r.filledFromOff).not.toContain('alergenos');
  });

  it('nunca toca apto_*, riesgo ni confidence', () => {
    const p = makeProduct({
      apto_vegano: false,
      apto_celiaco: false,
      apto_sin_lactosa: false,
      riesgo: 'alto',
      confidence: 0.7,
    });
    const off = makeOff({ ingredientsText: 'Agua.', allergensTags: ['en:milk'] });
    const r = mergeOffIntoExtraction(p, off);
    expect(r.product.apto_vegano).toBe(false);
    expect(r.product.apto_celiaco).toBe(false);
    expect(r.product.apto_sin_lactosa).toBe(false);
    expect(r.product.riesgo).toBe('alto');
    expect(r.product.confidence).toBe(0.7);
  });
});

describe('parseIngredientsText', () => {
  it('separa por comas, baja a minúsculas y trimea', () => {
    expect(parseIngredientsText('Harina de Trigo,  Azúcar , Sal.')).toEqual([
      'harina de trigo',
      'azúcar',
      'sal',
    ]);
  });

  it('descarta sub-ingredientes entre paréntesis', () => {
    expect(parseIngredientsText('Cacao en polvo (lecitina de soja), sal')).toEqual([
      'cacao en polvo',
      'sal',
    ]);
  });

  it('devuelve [] si el texto está vacío', () => {
    expect(parseIngredientsText('')).toEqual([]);
  });

  it('descarta strings demasiado largas (probablemente ruido)', () => {
    const longString = 'x'.repeat(70);
    expect(parseIngredientsText(`harina, ${longString}, sal`)).toEqual(['harina', 'sal']);
  });
});

describe('normalizeAllergens', () => {
  it('mapea tags conocidos', () => {
    expect(normalizeAllergens(['en:gluten', 'en:milk', 'en:eggs'])).toEqual(
      expect.arrayContaining(['gluten', 'leche', 'huevo']),
    );
  });

  it('descarta tags desconocidos', () => {
    expect(normalizeAllergens(['en:unknown-allergen', 'en:gluten'])).toEqual(['gluten']);
  });

  it('deduplica (tree-nuts y nuts ambos → "frutos secos")', () => {
    const result = normalizeAllergens(['en:nuts', 'en:tree-nuts']);
    expect(result).toEqual(['frutos secos']);
  });

  it('case-insensitive', () => {
    expect(normalizeAllergens(['EN:GLUTEN'])).toEqual(['gluten']);
  });
});
