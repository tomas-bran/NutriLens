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

  it('acepta un producto válido', () => {
    const r = ProductExtractionSchema.safeParse(baseValid);
    expect(r.success).toBe(true);
  });

  it('aplica defaults a arrays cuando no vienen', () => {
    const { ingredientes_detectados, alergenos, sellos, ...rest } = baseValid;
    void ingredientes_detectados;
    void alergenos;
    void sellos;
    const r = ProductExtractionSchema.parse(rest);
    expect(r.ingredientes_detectados).toEqual([]);
    expect(r.alergenos).toEqual([]);
    expect(r.sellos).toEqual([]);
  });

  it('rechaza producto vacío', () => {
    const r = ProductExtractionSchema.safeParse({ ...baseValid, producto: '' });
    expect(r.success).toBe(false);
  });

  it('rechaza categoría fuera del enum', () => {
    const r = ProductExtractionSchema.safeParse({ ...baseValid, categoria: 'inventado' });
    expect(r.success).toBe(false);
  });

  it('rechaza alérgeno fuera del enum', () => {
    const r = ProductExtractionSchema.safeParse({
      ...baseValid,
      alergenos: ['gluten', 'inventado'],
    });
    expect(r.success).toBe(false);
  });

  it('rechaza sello fuera del enum', () => {
    const r = ProductExtractionSchema.safeParse({
      ...baseValid,
      sellos: ['inventado'],
    });
    expect(r.success).toBe(false);
  });

  it('rechaza riesgo fuera del enum', () => {
    const r = ProductExtractionSchema.safeParse({ ...baseValid, riesgo: 'criticx' });
    expect(r.success).toBe(false);
  });

  it('rechaza confidence < 0', () => {
    const r = ProductExtractionSchema.safeParse({ ...baseValid, confidence: -0.1 });
    expect(r.success).toBe(false);
  });

  it('rechaza confidence > 1', () => {
    const r = ProductExtractionSchema.safeParse({ ...baseValid, confidence: 1.5 });
    expect(r.success).toBe(false);
  });

  it('rechaza apto_vegano no booleano', () => {
    const r = ProductExtractionSchema.safeParse({ ...baseValid, apto_vegano: 'no' });
    expect(r.success).toBe(false);
  });

  it('soporta producto sin alérgenos ni sellos', () => {
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
  it('acepta is_food_label=true con confidence válida', () => {
    expect(LabelKindSchema.safeParse({ is_food_label: true, confidence: 0.8 }).success).toBe(true);
  });
  it('rechaza si falta is_food_label', () => {
    expect(LabelKindSchema.safeParse({ confidence: 0.8 }).success).toBe(false);
  });
  it('rechaza confidence fuera de rango', () => {
    expect(LabelKindSchema.safeParse({ is_food_label: true, confidence: 2 }).success).toBe(false);
  });
});

describe('enums exportados', () => {
  it('tiene los 10 alérgenos definidos', () => {
    expect(ALERGENOS).toHaveLength(10);
  });
  it('tiene los 5 sellos argentinos', () => {
    expect(SELLOS).toHaveLength(5);
  });
  it('tiene 8 categorías incluyendo "otros"', () => {
    expect(CATEGORIAS).toHaveLength(8);
    expect(CATEGORIAS).toContain('otros');
  });
  it('tiene los 3 niveles de riesgo', () => {
    expect(RIESGOS).toEqual(['bajo', 'medio', 'alto']);
  });
});
