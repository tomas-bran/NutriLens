import { describe, it, expect } from 'vitest';
import {
  ProductExtractionSchema,
  LabelKindSchema,
  ALERGENOS,
  SELLOS,
  CATEGORIAS,
  RIESGOS,
} from '@schemas/product';

describe('ProductExtractionSchema', () => {
  const baseValid = {
    producto: 'Galletitas Test',
    categoria: 'galletitas' as const,
    ingredientes_detectados: ['harina de trigo'],
    alergenos: ['gluten'] as const,
    sellos: ['exceso en azúcares'] as const,
    apto_vegano: false,
    apto_celiaco: false,
    apto_sin_lactosa: true,
    riesgo: 'alto' as const,
    confidence: 0.92,
  };

  it('accepts a valid product', () => {
    const r = ProductExtractionSchema.safeParse(baseValid);
    expect(r.success).toBe(true);
  });

  it('applies array defaults when missing', () => {
    const { ingredientes_detectados, alergenos, sellos, ...rest } = baseValid;
    void ingredientes_detectados;
    void alergenos;
    void sellos;
    const r = ProductExtractionSchema.parse(rest);
    expect(r.ingredientes_detectados).toEqual([]);
    expect(r.alergenos).toEqual([]);
    expect(r.sellos).toEqual([]);
  });

  it('rejects an empty product name', () => {
    const r = ProductExtractionSchema.safeParse({ ...baseValid, producto: '' });
    expect(r.success).toBe(false);
  });

  it('rejects categoria outside the enum', () => {
    const r = ProductExtractionSchema.safeParse({ ...baseValid, categoria: 'unknown' });
    expect(r.success).toBe(false);
  });

  it('rejects an alergeno outside the enum', () => {
    const r = ProductExtractionSchema.safeParse({
      ...baseValid,
      alergenos: ['gluten', 'unknown'],
    });
    expect(r.success).toBe(false);
  });

  it('rejects a sello outside the enum', () => {
    const r = ProductExtractionSchema.safeParse({
      ...baseValid,
      sellos: ['unknown'],
    });
    expect(r.success).toBe(false);
  });

  it('rejects a riesgo outside the enum', () => {
    const r = ProductExtractionSchema.safeParse({ ...baseValid, riesgo: 'criticx' });
    expect(r.success).toBe(false);
  });

  it('rejects confidence < 0', () => {
    const r = ProductExtractionSchema.safeParse({ ...baseValid, confidence: -0.1 });
    expect(r.success).toBe(false);
  });

  it('rejects confidence > 1', () => {
    const r = ProductExtractionSchema.safeParse({ ...baseValid, confidence: 1.5 });
    expect(r.success).toBe(false);
  });

  it('rejects non-boolean apto_vegano', () => {
    const r = ProductExtractionSchema.safeParse({ ...baseValid, apto_vegano: 'no' });
    expect(r.success).toBe(false);
  });

  it('accepts a product without alergenos and sellos', () => {
    const r = ProductExtractionSchema.safeParse({
      ...baseValid,
      alergenos: [],
      sellos: [],
      riesgo: 'bajo',
    });
    expect(r.success).toBe(true);
  });
});

describe('LabelKindSchema', () => {
  it('accepts is_food_label=true with a valid confidence', () => {
    expect(LabelKindSchema.safeParse({ is_food_label: true, confidence: 0.8 }).success).toBe(true);
  });
  it('rejects payload missing is_food_label', () => {
    expect(LabelKindSchema.safeParse({ confidence: 0.8 }).success).toBe(false);
  });
  it('rejects confidence out of range', () => {
    expect(LabelKindSchema.safeParse({ is_food_label: true, confidence: 2 }).success).toBe(false);
  });
});

describe('exported enums', () => {
  it('exposes the 10 supported alergenos', () => {
    expect(ALERGENOS).toHaveLength(10);
  });
  it('exposes the 5 Argentine sellos', () => {
    expect(SELLOS).toHaveLength(5);
  });
  it('exposes 8 categorias including "otros"', () => {
    expect(CATEGORIAS).toHaveLength(8);
    expect(CATEGORIAS).toContain('otros');
  });
  it('exposes the 3 risk levels', () => {
    expect(RIESGOS).toEqual(['bajo', 'medio', 'alto']);
  });
});
