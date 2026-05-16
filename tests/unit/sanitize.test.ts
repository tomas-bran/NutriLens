import { describe, expect, it } from 'vitest';
import { ProductExtractionSchema } from '@schemas/product';
import { sanitizeProductExtraction } from '@schemas/sanitize';

const baseValid = {
  producto: 'Producto X',
  categoria: 'galletitas',
  ingredientes_detectados: ['harina'],
  alergenos: [],
  sellos: [],
  apto_vegano: false,
  apto_celiaco: false,
  apto_sin_lactosa: true,
  riesgo: 'alto',
  confidence: 0.9,
};

function sanitizeAndParse(input: unknown) {
  return ProductExtractionSchema.safeParse(sanitizeProductExtraction(input));
}

describe('sanitizeProductExtraction — defensive guards', () => {
  it.each([null, undefined, 'string', 42, true, []])('returns %s unchanged', (value) => {
    expect(sanitizeProductExtraction(value)).toBe(value);
  });

  it('does not mutate the input object', () => {
    const input = { ...baseValid, alergenos: ['lechita'] };
    sanitizeProductExtraction(input);
    expect(input.alergenos).toEqual(['lechita']);
  });
});

describe('sanitizeProductExtraction — alergenos allowlist', () => {
  it('drops values not in ALERGENOS without throwing', () => {
    const out = sanitizeProductExtraction({
      ...baseValid,
      alergenos: ['lechita', 'frutas tropicales', 'colorante 5'],
    }) as Record<string, unknown>;
    expect(out.alergenos).toEqual([]);
  });

  it('keeps only valid enum values, lowercased + deduped, preserving first-seen order', () => {
    const out = sanitizeProductExtraction({
      ...baseValid,
      alergenos: ['Leche', 'LECHE', 'gluten', 'gluten', 'invented'],
    }) as Record<string, unknown>;
    expect(out.alergenos).toEqual(['leche', 'gluten']);
  });

  it('discards non-string entries silently', () => {
    const out = sanitizeProductExtraction({
      ...baseValid,
      alergenos: ['gluten', 42, null, { nested: 'object' }],
    }) as Record<string, unknown>;
    expect(out.alergenos).toEqual(['gluten']);
  });

  it('still parses cleanly through Zod after sanitizing junk allergens', () => {
    const r = sanitizeAndParse({
      ...baseValid,
      alergenos: ['lechita', 'gluten', 'invented-stuff'],
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.alergenos).toEqual(['gluten']);
  });
});

describe('sanitizeProductExtraction — sellos allowlist (US-12)', () => {
  it('drops sellos not in the Argentine front-of-pack enum', () => {
    const out = sanitizeProductExtraction({
      ...baseValid,
      sellos: ['exceso en azúcares', 'exceso en grasas', 'exceso en algo'],
    }) as Record<string, unknown>;
    expect(out.sellos).toEqual(['exceso en azúcares']);
  });

  it('normalizes case to lower (matches the canonical enum spelling)', () => {
    const out = sanitizeProductExtraction({
      ...baseValid,
      sellos: ['EXCESO EN SODIO', 'Exceso En Calorías'],
    }) as Record<string, unknown>;
    expect(out.sellos).toEqual(['exceso en sodio', 'exceso en calorías']);
  });
});

describe('sanitizeProductExtraction — categoria coercion (US-13 Escenario 2)', () => {
  it.each(['lácteo', 'lacteo', 'snacks salados', '', 'random'])(
    'coerces unknown categoria "%s" to "otros"',
    (categoria) => {
      const out = sanitizeProductExtraction({ ...baseValid, categoria }) as Record<string, unknown>;
      expect(out.categoria).toBe('otros');
    },
  );

  it.each([
    'galletitas',
    'cereales',
    'snacks',
    'lácteos',
    'bebidas',
    'sin TACC',
    'veganos',
    'otros',
  ])('keeps valid categoria "%s" untouched', (categoria) => {
    const out = sanitizeProductExtraction({ ...baseValid, categoria }) as Record<string, unknown>;
    expect(out.categoria).toBe(categoria);
  });

  it('leaves non-string categoria for Zod to reject', () => {
    const out = sanitizeProductExtraction({ ...baseValid, categoria: 42 }) as Record<
      string,
      unknown
    >;
    expect(out.categoria).toBe(42);
    const r = ProductExtractionSchema.safeParse(out);
    expect(r.success).toBe(false);
  });
});

describe('sanitizeProductExtraction — riesgo coercion', () => {
  it('coerces unknown riesgo values to "bajo"', () => {
    const out = sanitizeProductExtraction({ ...baseValid, riesgo: 'moderado' }) as Record<
      string,
      unknown
    >;
    expect(out.riesgo).toBe('bajo');
  });

  it('keeps valid riesgo untouched', () => {
    for (const r of ['bajo', 'medio', 'alto'] as const) {
      const out = sanitizeProductExtraction({ ...baseValid, riesgo: r }) as Record<string, unknown>;
      expect(out.riesgo).toBe(r);
    }
  });
});

describe('sanitizeProductExtraction — ingredients normalization (US-10)', () => {
  it('trims whitespace and drops empty strings', () => {
    const out = sanitizeProductExtraction({
      ...baseValid,
      ingredientes_detectados: ['  harina de trigo ', '', '   ', 'azúcar'],
    }) as Record<string, unknown>;
    expect(out.ingredientes_detectados).toEqual(['harina de trigo', 'azúcar']);
  });

  it('drops non-string ingredient entries', () => {
    const out = sanitizeProductExtraction({
      ...baseValid,
      ingredientes_detectados: ['harina', 42, null, 'azúcar'],
    }) as Record<string, unknown>;
    expect(out.ingredientes_detectados).toEqual(['harina', 'azúcar']);
  });
});
